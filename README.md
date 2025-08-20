# Email Validator API - Vercel Deployment Guide

## 🚀 Why Vercel is Perfect for This

✅ **Free tier** - Up to 100GB bandwidth/month  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Global CDN** - Fast worldwide  
✅ **Zero config** - Deploy with one command  
✅ **Custom domains** - Free SSL certificates  
✅ **Serverless** - Pay only for usage

## 📁 Project Structure

Create this folder structure on your computer:

```
email-validator-api/
├── api/
│   ├── index.js         # Welcome endpoint
│   ├── verify.js        # Main validation endpoint
│   ├── health.js        # Health check
│   └── docs.js          # API documentation
├── package.json         # Dependencies
├── vercel.json         # Vercel configuration
└── README.md           # Optional documentation
```

## 🛠️ Step-by-Step Deployment

### Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

### Step 2: Install Vercel CLI (Optional)

```bash
# Install globally
npm install -g vercel

# Or use with npx (no installation needed)
npx vercel --help
```

### Step 3: Create Your Project

**Option A: Using Vercel Dashboard (Easiest)**

1. **Create a new GitHub repository:**

   - Go to GitHub → Create new repository
   - Name it `email-validator-api`
   - Make it public or private
   - Create repository

2. **Clone and add files:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/email-validator-api.git
   cd email-validator-api

   # Create the api directory
   mkdir api

   # Create each file using your text editor or IDE
   # Copy the contents from the artifacts above
   ```

3. **Add all files to your repository:**

   ```bash
   git add .
   git commit -m "Initial email validator API"
   git push origin main
   ```

4. **Deploy via Vercel Dashboard:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"
   - Wait ~1 minute for deployment

**Option B: Using Vercel CLI**

```bash
# Create project directory
mkdir email-validator-api
cd email-validator-api

# Initialize project
npm init -y

# Create API directory and files
mkdir api
# Add all the files from the artifacts above

# Deploy
npx vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? email-validator-api
# - Directory? ./
# - Override settings? No
```

### Step 4: Test Your Deployment

After deployment, you'll get a URL like: `https://email-validator-api-xyz.vercel.app`

**Test the endpoints:**

```bash
# Replace YOUR_VERCEL_URL with your actual URL

# 1. Welcome page
curl https://YOUR_VERCEL_URL/api/index

# 2. Health check
curl https://YOUR_VERCEL_URL/api/health

# 3. API documentation
curl https://YOUR_VERCEL_URL/api/docs

# 4. Email validation
curl -X POST https://YOUR_VERCEL_URL/api/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com"}'
```

## 🌐 Add Custom Domain (Optional)

### Step 1: Add Domain in Vercel

1. Go to your project dashboard on Vercel
2. Click "Domains" tab
3. Add your domain (e.g., `api.yourdomain.com`)

### Step 2: Update DNS

Add these DNS records at your domain registrar:

**For subdomain (recommended):**

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

**For apex domain:**

```
Type: A
Name: @
Value
```
