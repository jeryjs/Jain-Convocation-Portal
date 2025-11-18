const { google } = require('googleapis');
const { getSettings } = require("../config/settings");
const { cache, TTL } = require("../config/cache");
const { limitedMap } = require("../utils/concurrency");

const EDGE_CACHE_PROXY = "https://cdn.sa-fet.com/edge-cache";

const _getAuth = async () => {
    const auth = new google.auth.GoogleAuth({
        apiKey: process.env.GDRIVE_API_KEY,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    // Return the authenticated client
    return await auth.getClient();
};

// Create drive instance dynamically
let driveInstance = null;
const _getDrive = async () => {
    if (!driveInstance) {
        const authClient = await _getAuth();
        driveInstance = google.drive({ version: 'v3', auth: authClient });
    }
    return driveInstance;
};

const _getShareId = () => {
    return getSettings("courses").folderId;
};

const LEVEL_CHILD_KEYS = ['times', 'batches'];
const TREE_CACHE = new Map();

const _getTreeCacheKey = (parentId, depth) => `${parentId}:${depth}`;

const _fetchFolderTree = async (drive, parentId, depth = 0) => {
    const cacheKey = _getTreeCacheKey(parentId, depth);
    if (TREE_CACHE.has(cacheKey)) {
        return TREE_CACHE.get(cacheKey);
    }

    const promise = (async () => {
        const folders = await _getFolders(drive, parentId);
        if (depth >= LEVEL_CHILD_KEYS.length) {
            return folders.map(({ name, id }) => ({ name, id }));
        }

        const childKey = LEVEL_CHILD_KEYS[depth];
        const children = await limitedMap(folders, async (folder) => {
                const node = { name: folder.name, id: folder.id };
                node[childKey] = await _fetchFolderTree(drive, folder.id, depth + 1);
                return node;
            },
            50
        );

        return children;
    })().catch((err) => {
        TREE_CACHE.delete(cacheKey);
        throw err;
    });

    TREE_CACHE.set(cacheKey, promise);
    return promise;
};

const _getFolders = async (drive, parentId) => {
    const cacheKey = `gdrive_folders_${parentId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        console.log("📦 Serving cached folders for parentId:", parentId);
        return cached;
    }
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
    }, { headers: { referer: 'jain-convocation-portal.vercel.app' } });
    await cache.set(cacheKey, res.data.files, TTL.COURSES);
    return res.data.files;
};

const getCourseFolders = async () => {
    const cacheKey = "course_folders";
    const cached = await cache.get(cacheKey);
    if (cached) {
        console.log("📦 Serving cached sessions");
        return cached;
    }

    const drive = await _getDrive(); // Get drive instance
    const shareId = _getShareId();

    TREE_CACHE.clear();
    const structure = await _fetchFolderTree(drive, shareId, 0);

    await cache.set(cacheKey, structure, TTL.COURSES);
    return structure;
};

const getCourseImages = async (day, time, batch) => {
    const cacheKey = `course_images_${day}_${time}_${batch}`;
    const cachedImages = await cache.get(cacheKey);

    if (cachedImages) {
        console.log("📦 Serving cached images");
        return cachedImages;
    }

    const drive = await _getDrive(); // Get drive instance
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
    }, { headers: { referer: 'jain-convocation-portal.vercel.app' } });

    const images = res.data.files.map(file => ({
        [`${path}/${file.name}`]: file.thumbnailLink ? `${EDGE_CACHE_PROXY}/${file.thumbnailLink.replace(/=s\d+/, '=s480')}` : `https://drive.google.com/uc?id=${file.id}&export=view`,
    }));

    await cache.set(cacheKey, images, TTL.COURSES);
    return images;
};

const getImageLinks = async (fullPaths) => {
    const cacheKey = `image_links_${fullPaths.join(",")}`;
    const cachedLinks = await cache.get(cacheKey);

    if (cachedLinks) {
        console.log("📦 Serving cached Links");
        return cachedLinks;
    }

    const drive = await _getDrive(); // Get drive instance
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
                }, { headers: { referer: 'jain-convocation-portal.vercel.app' } });
                const file = res.data.files[0];
                if (!file) throw new Error('File not found');

                // Use webContentLink if available, otherwise webViewLink
                return {
                    name: path,
                    url: file.webViewLink,
                };
            })
        );

        await cache.set(cacheKey, links, TTL.COURSES);
        return links;
    } catch (error) {
        console.error("Error getting image links:", error);
        throw error;
    }
};

module.exports = { getCourseFolders, getCourseImages, getImageLinks };
