# 📝 Profile Based Task Manager CRUD App (Node.js + Express)

A simple **Task Manager** backend built with **Node.js** and **Express.js** that allows users to manage tasks with full CRUD (Create, Read, Update, Delete) functionality.  
Tasks and user information is stored in mysql database.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/darkEye-2021831014/ProfileBasedTaskManager.git
cd ProfileBasedTaskManager
```

### 2. Run Backend Server

```bash
npm run dev
```

## 3. API Endpoints

```bash
GET -> http://localhost:4000/tasks/
GET -> http://localhost:4000/tasks/1
GET -> http://localhost:4000/tasks/?q=value
GET -> http://localhost:4000/tasks/?status=To Do

POST -> http://localhost:4000/tasks/
POST -> http://localhost:4000/auth/register
POST -> http://localhost:4000/auth/login
POST -> http://localhost:4000/auth/forgot-password
POST -> http://localhost:4000/auth/reset-password

PUT -> http://localhost:4000/tasks/1
DELETE -> http://localhost:4000/tasks/1
```
