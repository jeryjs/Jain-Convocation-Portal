const { google } = require('googleapis');
const axios = require("axios");
const { getSettings } = require("../config/settings");
const { cache, TTL } = require("../config/cache");

const getAuth = async () => {
    const settings = getSettings();
    
    // Fix typo and add error handling
    let credentials;
    try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    } catch (error) {
        console.error("Error parsing Google Service Account credentials:", error);
        throw new Error("Invalid Google Service Account credentials");
    }

    if (!credentials) {
        throw new Error("Google Service Account credentials not found");
    }

    const auth = new google.auth.GoogleAuth({
        apiKey: "AIzaSyDH2EQTrAEq9kP0yS_PuFS61mllUk0pDeo",
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    // Return the authenticated client
    return await auth.getClient();
};

// Create drive instance dynamically
const getDrive = async () => {
    const authClient = await getAuth();
    return google.drive({ version: 'v3', auth: authClient });
};

const getShareId = () => {
    return getSettings("courses").folderId;
};

const getCourseFolders = async () => {
    const cacheKey = "course_folders";
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log("📦 Serving cached sessions");
        return cached;
    }

    const drive = await getDrive(); // Get drive instance
    const shareId = getShareId();
    
    const getFolders = async (parentId) => {
        const res = await drive.files.list({
			q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name)',
        }, {headers: {referer: 'jain-convocation-portal.vercel.app'}});
        return res.data.files;
    };

    const days = await getFolders(shareId);
    const structure = await Promise.all(days.map(async day => ({
        name: day.name,
        id: day.id,
        times: await Promise.all((await getFolders(day.id)).map(async time => ({
            name: time.name,
            id: time.id,
            batches: (await getFolders(time.id)).map(batch => ({ name: batch.name, id: batch.id }))
        })))
    })));

    cache.set(cacheKey, structure, TTL.COURSES);
    return structure;
};

const getCourseImages = async (day, time, batch) => {
    const cacheKey = `course_images_${day}_${time}_${batch}`;
    const cachedImages = cache.get(cacheKey);

    if (cachedImages) {
        console.log("📦 Serving cached images");
        return cachedImages;
    }

    const drive = await getDrive(); // Get drive instance
    const structure = await getCourseFolders();
    const dayObj = structure.find(d => d.name === day);
    const timeObj = dayObj?.times.find(t => t.name === time);
    const batchObj = timeObj?.batches.find(b => b.name === batch);
    if (!batchObj) throw new Error('Batch not found');

    const batchId = batchObj.id;
    const path = `${day}/${time}/${batch}`;
    const res = await drive.files.list({
        q: `'${batchId}' in parents and mimeType contains 'image/'`,
        fields: 'files(id, name, thumbnailLink)',
    }, {headers: {referer: 'jain-convocation-portal.vercel.app'}});

    const images = res.data.files.map(file => ({
        [`${path}/${file.name}`]: file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s480') : '',
    }));

    cache.set(cacheKey, images, TTL.COURSES);
    return images;
};

const getImageLinks = async (fullPaths) => {
    const cacheKey = `image_links_${fullPaths.join(",")}`;
    const cachedLinks = cache.get(cacheKey);

    if (cachedLinks) {
        console.log("📦 Serving cached Links");
        return cachedLinks;
    }

    const drive = await getDrive(); // Get drive instance
    const structure = await getCourseFolders();
    
    try {
        const links = await Promise.all(
            fullPaths.map(async (path) => {
                const parts = path.split('/');
                const [day, time, batch, image] = parts;
                const dayObj = structure.find(d => d.name === day);
                const timeObj = dayObj?.times.find(t => t.name === time);
                const batchObj = timeObj?.batches.find(b => b.name === batch);
                if (!batchObj) throw new Error('Batch not found');

                const res = await drive.files.list({
                    q: `name = '${image}' and '${batchObj.id}' in parents`,
                    fields: 'files(id, webContentLink, webViewLink)',
                });
                const file = res.data.files[0];
                if (!file) throw new Error('File not found');
                
                // Use webContentLink if available, otherwise webViewLink
                return {
                    name: path,
                    url: file.webContentLink || file.webViewLink,
                };
            })
        );

        cache.set(cacheKey, links, TTL.COURSES);
        return links;
    } catch (error) {
        console.error("Error getting image links:", error);
        throw error;
    }
};

module.exports = { getCourseFolders, getCourseImages, getImageLinks };