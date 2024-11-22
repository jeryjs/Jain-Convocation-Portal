# Jain Convocation Portal
> https://jain-convocation-portal.vercel.app/
> | Test Account | Username | Password |
> |--------------|----------|----------|
> | Regular user | TEST006  | 12345678 |
> | Admin        | ADMIN    | 12345678 |


A React app with UI in MUI and Express.js backend for hosting the pictures taken during Jain University’s 14th convocation, which expects up to 17,000 visitors.
It handled upto 20 simultaneous requests in a second and served features for Requesting Softcopy and Hardcopy.

## Features
- **React Frontend**: Built using React and MUI for a modern and responsive UI.
- **Express Backend**: Handles API requests and serves the React app.
- **Image Hosting**: Upload and managed convocation photos via OneDrive.
- **Scalability**: Designed to handle thousands of visitors.
- **Customisable**: Provides options for Payment/UPI settings, Firestore Database, OneDrive Folder, etc.

## Preview
<img src="https://github.com/user-attachments/assets/5fb2ad76-08b9-493b-b368-381dd3a722f0" width="49%" alt="Login Page">
<img src="https://github.com/user-attachments/assets/3c85cd8f-b5e1-41fe-9cf1-85ee9774615f" width="49%" alt="Admin Dashboard">
<img src="https://github.com/user-attachments/assets/a33b4312-9a17-4f3e-b1f8-15231ed57703" width="49%" alt="Sessions Page">
<img src="https://github.com/user-attachments/assets/9c0ab3fe-7fab-4bd1-90f9-959b9848e4ab" width="49%" alt="Gallery Page">
<img src="https://github.com/user-attachments/assets/84539bf1-c71f-4e24-831e-64a2d3f35e76" width="99%" alt="Instructions Infographic">

## Installation

#### Prerequisites
- Node.js
- npm

#### Clone the Repository
```bash
git clone https://github.com/jeryjs/Jain-Convocation-Portal.git
cd Jain-Convocation-Portal
```

#### Install Dependencies
```bash
npm install

cd frontend
npm install

cd ../backend
npm install
```

### Environment Variables Setup

#### Required Variables
```properties
GMAIL_USER=
GMAIL_APP_PASS=
PORT=
ONEDRIVE_SHAREID=
JWT_SECRET=
FIREBASE_ACCOUNT_KEY_JSON=
```

#### Step-by-Step Instructions

##### 1. Gmail Configuration
```properties
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
```
1. Use a Gmail account
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Go to Google Account Settings > Security
   - Select "App Passwords"
   - Create new app password for "Mail"
   - Copy the 16-character password

##### 2. Port Configuration
```properties
PORT=5000
```
- Default is 5000
- Change if port conflicts exist

##### 3. OneDrive Setup
```properties
ONEDRIVE_SHAREID=YourShareIdHere
```
1. Upload photos to OneDrive folder
2. Right-click folder > Share
3. Copy share link
4. Extract ShareID from URL:
   - Format: `https://1drv.ms/f/s!{ShareID}`
   - Copy only the {ShareID} part

##### 4. JWT Configuration
```properties
JWT_SECRET=your-secret-key
```
- Create any secure random string
- Recommended: Use a password generator

##### 5. Firebase Setup
```properties
FIREBASE_ACCOUNT_KEY_JSON={your-firebase-key-json}
```
1. Create Firebase project
2. Go to Project Settings > Service Accounts
3. Generate New Private Key
4. Copy entire JSON content
5. Paste as single line

> Note: Store .env in backend folder and never commit to version control.

## Usage

### Running the Development Server
```bash
cd Jain-Convocation-Portal
npm run dev
```
Navigate to `http://localhost:3000` to see the app in action.
> Make sure to setup admin/test accounts in the firestore database first.

## Hosting

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjeryjs%2FJain-Convocation-Portal)

#### Automatic Deployment
1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Select repository and configure project settings
4. Vercel will automatically deploy your application

#### Manual Deployment
1. Install Vercel CLI:
    ```bash
    npm install -g vercel
    ```
2. Login to Vercel:
    ```bash
    vercel login
    ```
3. Deploy the project:
    ```bash
    vercel
    ```

The application will be available at `https://your-project.vercel.app`
## License
This project is licensed under the GNU Affero General Public License v3.0 License - see the [LICENSE](LICENSE) file for details.
