const axios = require('axios');
const { getSettings } = require('../config/settings');
const { cache, TTL } = require('../config/cache');

const getShareId = () => {
  const settings = getSettings();
  return settings.courses?.folderId || process.env.ONEDRIVE_SHAREID;
};

const getCourseFolders = async () => {
  const cacheKey = 'course_folders';
  const cachedFolders = cache.get(cacheKey);
  
  if (cachedFolders) return cachedFolders;

  const shareId = getShareId();
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root/children`);
  const folders = response.data.value
    .filter(folder => folder.folder && folder.folder.childCount > 0)
    .map(folder => folder.name);

  cache.set(cacheKey, folders, TTL.COURSES);
  return folders;
};

const getCourseImages = async (course) => {
  const cacheKey = `course_images_${course}`;
  const cachedImages = cache.get(cacheKey);
  
  if (cachedImages) return cachedImages;

  const shareId = getShareId();
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${course}?expand=children(expand=thumbnails)`);
  const images = response.data.children
    .filter(item => item.image)
    .map(item => ({
      [item.name]: item.thumbnails[0].large.url.replace(/width=\d+&height=\d+/, 'width=480&height=480')
    }));

  cache.set(cacheKey, images, TTL.COURSES);
  return images;
};

const getImageLinks = async (course, images) => {
  const cacheKey = `image_links_${images.join(',')}`;
  const cachedLinks = cache.get(cacheKey);
  
  if (cachedLinks) return cachedLinks;

  const shareId = getShareId();
  try {
    const links = await Promise.all(
      images.map(async (image) => {
        const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${course}/${image}`);
        return {
          name: image,
          url: response.data['@content.downloadUrl']
        };
      })
    );
    
    cache.set(cacheKey, links, TTL.COURSES);
    return links;
  } catch (error) {
    console.error('Error getting image links:', error);
    throw error;
  }
};

module.exports = { getCourseFolders, getCourseImages, getImageLinks };
