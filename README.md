# 🎧 Athena Podcast Backend

This is the **backend repository** for the [Athena Podcast App](https://github.com/AthenaPodcast), an AI-powered podcast platform developed as a software graduation project.

> 🛠 Author: **Tala AbuSoud** (Backend Development)  
> 💻 [Frontend Repository](https://github.com/AthenaPodcast/Athena_FE) by Raya Thawabe  
> 📺 [Demo](https://drive.google.com/file/d/16jRErNt2b3PZ4T_HlK6bqPae9mTz1NVK/view?usp=sharing)

---

## 🚀 Features

- 🔐 **User Authentication**: Secure JWT-based login/signup supporting users, channels, and admins.
- 🎙 **Podcast & Episode Management**: Channels can create and manage their own podcasts and episodes, while admins can manage external YouTube-based podcasts. 
- 🎧 **Audio Matching**: Audio fingerprinting with Dejavu to match episodes from short audio clips.
- 🔍 **Smart Search:**: Smart search with filters (category, language), autofill and suggestions.
- ⭐ **Episode Reviews**: Users can rate and review episodes with star ratings and comments.
- 📢 **Ad System**: Support for audio ad campaigns with playback logging and targeting.
- 🗂 **Explore Pages**: Paginated listings for categories, podcasts, and channels
- 🔔 **Notification System**: In-app notifications with scheduled cleanup using cron jobs
- 🛠 **Admin Panel**: Manage users, channels, podcasts, ads, insights, and app-wide statistics.
- 📋 **Transcript Tools**: Real-time transcript syncing, search, and word highlighting.
- 🧠 **AI Tools**:
  - GPT-powered chatbot:
    - Episode summarization
    - Transcript translation
    - Interactive Q&A chatbot
  - OpenAI Whisper speech-to-text
  - TF-IDF-based recommendation system
  - OpenAI moderation for filtering harmful reviews
- 🎯 **Personalized Recommendations**: Based on user activity and TF-IDF similarity using FastAPI.
- 🤖 **Content Moderation**: OpenAI Moderation API ensures safe and respectful content.
- 🌍 **External Content Support**: Admins can add and manage external podcasts and YouTube episodes.
- ☁️ **Cloudinary Integration**: For image and audio uploads, storage, and optimization.
- 🧩 **Microservices (FastAPI)**:
  - TF-IDF recommendation system
  - Audio matcher via Dejavu


---

## 🛠 Tech Stack

| Layer       | Technology               |
|-------------|--------------------------|
| Backend     | Node.js, Express         |
| Database    | PostgreSQL               |
| AI Services | OpenAI API, Whisper      |
| Audio Match | Dejavu (Python)          |
| Auth        | JWT, bcrypt              |
| Storage     | Cloudinary               |

---


## 🗄️ Database Schema 
- Below is the Entity Relationship Diagram (ERD) for Athena’s backend database:
  <img width="2861" height="2265" alt="ERD" src="https://github.com/user-attachments/assets/6cbac8cc-3ec8-4fc4-93ea-f482f502bc6f" />

- Below is the Entity Relationship Diagram (ERD) for Dejavu’s backend database:
  <img width="641" height="501" alt="ERD_dejavu" src="https://github.com/user-attachments/assets/52218884-83ce-4625-b2be-2c79d8a53642" />

---

## 🏗 System Architecture

The system is composed of a Node.js/Express backend, two Python-based FastAPI microservices, and integrations with PostgreSQL, Cloudinary, OpenAI APIs, and Dejavu for audio fingerprinting.
<img width="683" height="510" alt="image" src="https://github.com/user-attachments/assets/836db098-bcf9-4ea7-959f-260b27a1f5ad" />


---

## 📁 Folder Structure

```bash
Athena_BE/
├── dejavu/                 # Python audio fingerprinting service
├── matcher/                # FastAPI microservice for audio matching
├── recommender/            # FastAPI microservice for TF-IDF recommendations
├── src/                    # Main backend code
│   ├── config/             # Configuration for uploads (multer), Cloudinary, and email
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth, error handling, etc.
│   ├── models/             # DB models (PostgreSQL)
│   ├── routes/             # API routes
│   ├── services/           # Business logic, external APIs
│   ├── utils/              # Helper functions
├── uploads/                # Local uploaded files
├── db.js                   # Database connection setup 
├── app.js                  # Express app entry point 
└── server.js               # Main server launcher
```
---

## 📘 API Documentation

Detailed API documentation will be added soon, including:

- Postman Collection
- API auth rules and role permissions
- Microservice integration (TF-IDF & Matcher)

---

## 👤 Author

**Tala AbuSoud**  
Backend Developer & System Architect for Athena  
GitHub: [@TalaAbuSoud](https://github.com/TalaAbuSoud)


---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

     
