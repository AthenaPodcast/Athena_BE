import psycopg2
import os
from dotenv import load_dotenv
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timezone
from db import get_connection

conn = get_connection()
with conn.cursor() as cur:
    cur.execute("SELECT NOW()")
    print("Connected, current time:", cur.fetchone())

mood_to_categories = {
    "happy": [4, 5, 10, 14],               # Fiction, Books, Arts, Relationships
    "sad": [6, 12, 15, 17],                # Self-Improvement, Health & Fitness, Education, Religion and Spirituality
    "loving": [14, 5, 10, 17],             # Relationships, Books, Arts, Religion and Spirituality
    "depressed": [6, 12, 17, 15],          # Self-Improvement, Health & Fitness, Religion and Spirituality, Education
    "grateful": [6, 17, 12, 5],            # Self-Improvement, Religion and Spirituality, Health & Fitness, Books
    "stressed": [6, 12, 17, 15, 10],       # Self-Improvement, Health & Fitness, Religion and Spirituality, Education, Arts
    "angry": [3, 7, 11, 13, 6]             # Sport, True Crime, Business, Technology, Self-Improvement
}

def fetch_user_context(user_id):
    conn = get_connection()
    with conn.cursor() as cur:
        def fetch_ids(query, param):
            cur.execute(query, (param,))
            return [row[0] for row in cur.fetchall()]

        # get mood first (before using it)
        cur.execute("SELECT mood FROM moodtracker WHERE account_id = %s", (user_id,))
        row = cur.fetchone()
        mood = row[0] if row else None

        # merge user interests and mood based categories
        mood_category_ids = mood_to_categories.get(mood, [])

        cur.execute("""
            SELECT name FROM categories 
            WHERE id IN (
                SELECT category_id FROM userinterests WHERE account_id = %s
                UNION
                SELECT unnest(%s::int[])
            )
        """, (user_id, mood_category_ids))
        interests = [row[0] for row in cur.fetchall()]

        saved_podcasts = fetch_ids("SELECT podcast_id FROM podcast_saves WHERE account_id = %s AND saved = true", user_id)
        liked_episodes = fetch_ids("SELECT episode_id FROM episode_likes WHERE account_id = %s AND liked = true", user_id)
        played_episodes = fetch_ids("SELECT episode_id FROM recentlyplayed WHERE account_id = %s", user_id)
        reviewed_episodes = fetch_ids("SELECT episode_id FROM reviews WHERE account_id = %s AND rating >= 4", user_id)

        cur.execute("SELECT age, gender FROM userprofile WHERE account_id = %s", (user_id,))
        row = cur.fetchone()
        age, gender = row if row else (None, None)

    return {
        "interests": interests,
        "saved_podcasts": saved_podcasts,
        "liked_episodes": liked_episodes,
        "played_episodes": played_episodes,
        "reviewed_episodes": reviewed_episodes,
        "mood": mood,
        "age": age,
        "gender": gender
    }

def fetch_content():
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id, e.name, e.description, e.script, e.language, p.name as podcast_name, e.created_at
            FROM episodes e
            JOIN podcasts p ON p.id = e.podcast_id
        """)
        episodes = pd.DataFrame(cur.fetchall(), columns=[
            "id", "name", "description", "script", "language", "podcast_name", "created_at"
        ])

        cur.execute("""
            SELECT p.id, p.name, p.description, c.name as category, p.created_at
            FROM podcasts p
            JOIN podcastcategory pc ON pc.podcast_id = p.id
            JOIN categories c ON c.id = pc.category_id
        """)
        podcasts = pd.DataFrame(cur.fetchall(), columns=[
            "id", "name", "description", "category", "created_at"
        ])

    return episodes, podcasts

def get_recommendations(user_id, override_mood=None):
    user = fetch_user_context(user_id)
    episodes, podcasts = fetch_content()

    mood = override_mood or user["mood"]
    mood_cat_ids  = mood_to_categories.get(mood, [])
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM categories WHERE id = ANY(%s)", (mood_cat_ids,))
        mood_category_names = [row[0] for row in cur.fetchall()]

    age_group = f"age_group_{(user['age'] // 10) * 10}s" if user['age'] else ""
    gender_tag = f"gender_{user['gender']}" if user['gender'] else ""

    mood_category_names_weighted = mood_category_names * 3
    # build user preference text
    user_text = " ".join(user["interests"] + mood_category_names_weighted + [age_group, gender_tag])
    
    ep_matches = episodes[episodes["id"].isin(user["liked_episodes"] + user["played_episodes"] + user["reviewed_episodes"])]
    user_text += " " + " ".join(ep_matches[["description", "script"]].fillna("").agg(" ".join, axis=1).tolist())

    pod_matches = podcasts[podcasts["id"].isin(user["saved_podcasts"])]
    user_text += " " + " ".join(pod_matches["description"].fillna("").tolist())

    # vectorize and score episodes
    episodes["text"] = episodes[["description", "script", "podcast_name"]].fillna("").agg(" ".join, axis=1)
    ep_texts = [user_text] + episodes["text"].tolist()
    ep_vectors = TfidfVectorizer(stop_words="english").fit_transform(ep_texts)
    ep_scores = cosine_similarity(ep_vectors[0:1], ep_vectors[1:]).flatten()
    episodes["score"] = ep_scores

    # vectorize and score podcasts
    podcasts["text"] = podcasts[["name", "description", "category"]].fillna("").agg(" ".join, axis=1)
    pod_texts = [user_text] + podcasts["text"].tolist()
    pod_vectors = TfidfVectorizer(stop_words="english").fit_transform(pod_texts)
    pod_scores = cosine_similarity(pod_vectors[0:1], pod_vectors[1:]).flatten()
    podcasts["score"] = pod_scores

    print(podcasts[["id", "name", "score"]].sort_values(by="score", ascending=False).head(5))

    # apply minimum score cutoff and remove played episodes
    episodes = episodes[episodes["score"] >= 0.05]
    episodes = episodes[~episodes["id"].isin(user["played_episodes"])]

    # boost recent episodes
    episodes["score"] = episodes.apply(lambda row: boost_recent_score(row["score"], row["created_at"]), axis=1)

    # apply to podcasts too
    podcasts = podcasts[podcasts["score"] >= 0.01]
    podcasts["score"] = podcasts.apply(lambda row: boost_recent_score(row["score"], row["created_at"]), axis=1)

    # final output
    top_eps = episodes.nlargest(3, "score")[["id", "name", "score"]].assign(type="episode")
    top_pods = podcasts.nlargest(2, "score")[["id", "name", "score"]].assign(type="podcast")
    result = pd.concat([top_eps, top_pods]).sort_values(by="score", ascending=False)
    result = result.drop_duplicates(subset=["type", "id"], keep="first")
    return result[["type", "id", "name", "score"]].to_dict(orient="records")

def boost_recent_score(score, created_at):
    if pd.isnull(created_at):
        return score  # skip if missing date

    now = datetime.now(tz=created_at.tzinfo)  
    days_old = (now - created_at).days

    if days_old < 7:
        return score * 1.3
    elif days_old < 30:
        return score * 1.1
    return score

# for testing
if __name__ == "__main__":
    recs = get_recommendations(user_id=1)
    print("\nTop Recommendations:\n")
    for r in recs:
        print(f"[{r['type'].capitalize()}] {r['name']} (Score: {r['score']:.3f})")
