const buildPrompt = ({ action, message, episode, targetLanguage, timestamp, recommendations = [], previousEpisode = null }) => {
  const {
    script = '',
    name = '',
    language = 'English',
    speakers = [],
    podcast_name = 'an unknown podcast'
  } = episode;

  const slicedScript = script ? script.slice(0, 3000) : 'No script available.';
  const speakerText = (speakers.length > 0)
    ? `The speakers are: ${speakers.join(', ')}.`
    : `The speakers are not listed for this episode.`;

  switch (action) {
    case 'summarize':
      return `Summarize the following episode titled "${name}" from the podcast "${podcast_name}":\n\n${slicedScript}`;

    case 'translate':
      return `Translate the following podcast script into ${targetLanguage || 'Arabic'}:\n\n${slicedScript}`;

    case 'ask':
    default:
        if (message.toLowerCase().includes('recommend')) {
        const recText = recommendations.length > 0
            ? recommendations.map((r, i) => `${i + 1}. "${r.name}" (ID: ${r.id}) — ${r.description}`).join('\n')
            : 'There are no recommendations available right now.';
        
        return `You are an assistant for a podcast app. The user wants episode recommendations. ONLY use the following episodes, which are REAL episodes from our Athena app. DO NOT invent or mention any other episodes or podcasts outside this list.\n\n${recText}\n\nUser: ${message}`;
        }

        if (message.toLowerCase().includes('differ') && previousEpisode) {
            const prevScript = previousEpisode.script ? previousEpisode.script.slice(0, 2000) : 'No previous script available.';
            return `Here are two podcast scripts.\n\nCurrent Episode: "${name}"\n${slicedScript}\n\nPrevious Episode: "${previousEpisode.name}"\n${prevScript}\n\nThe user asked: ${message}.\nCompare the two episodes and explain how they differ.`;
        }

        let context = `You are a helpful assistant for podcast listeners. The episode is titled "${name}" from the podcast "${podcast_name}" in ${language}.\n${speakerText}\n`;
        if (timestamp) {
            context += `The user is currently listening at ${timestamp} seconds. Focus your answer around that part of the script.\n`;
        }
        return `${context}\nScript:\n${slicedScript}\n\nUser asked: "${message}"\n\nReply accordingly.`;
  }
};

module.exports = { buildPrompt };