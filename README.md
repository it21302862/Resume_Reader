# MCP Server (Model Context Protocol Server)

A server for managing and chatting with your CVs, with email notifications when CVs are uploaded and processed. Built using **Next.js**, **Node.js**, and **Nodemailer**.

---

## Features

- **CV Chat:** Ask questions about your uploaded CV, e.g., "What was my role at my last position?"  
- **CV Upload:** Upload PDF resumes, automatically generate a thumbnail of the first page.  
- **Email Notifications:** Receive emails when a CV has been successfully processed.  
- **Optional Frontend:** Minimal Next.js frontend to view CVs, chat, and manage uploads.

## UI Front View
![CV List View](https://github.com/it21302862/Resume_Reader/blob/main/public/screenshots/PdfList.png)
![CV Upload View](https://github.com/it21302862/Resume_Reader/blob/main/public/screenshots/PdfUploader.png)
![CV Reader View](https://github.com/it21302862/Resume_Reader/blob/main/public/screenshots/CvReader.png)
![Mail Recieved View](https://github.com/it21302862/Resume_Reader/blob/main/public/screenshots/mailsender.png)

---

## Directory Structure

mcp-server/
├─ public/
│ └─ cvs/ # Uploaded PDFs and generated thumbnails
├─ src/
│ ├─ app/
│ │ ├─ api/
│ │ │ ├─ chat/ # Chat API for CV questions
│ │ │ ├─ cv/
│ │ │ │ ├─ list/ # List all uploaded CVs
│ │ │ │ └─ upload/ # Upload new CV
│ │ │ └─ email/ # Send notification emails
│ └─ lib/ # Utility functions (CV parsing, etc.)
├─ .env.local # Environment variables (ignored by Git)
├─ package.json
└─ README.md


---

## Environment Variables

Create a `.env.local` file in the root:

```bash
# LLM / AI settings
LLM_API_URL=https://api.groq.com/openai/v1/chat/completions
LLM_API_KEY=your_groq_api_key_here

# Default resume path (optional)
RESUME_PATH=./public/resume.pdf

# Email settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Clone the repo
git clone https://github.com/yourusername/mcp-server.git
cd mcp-server

# Install dependencies
npm install
# or
yarn install

# Development mode
npm run dev
# or
yarn dev

# Production build
npm run build
npm start
