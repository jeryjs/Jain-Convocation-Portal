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
  
  try {
    // Get days (top level folders)
    const daysResponse = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root/children?$filter=folder ne null`);
    
    // Process each day to get its time slots
    const structure = await Promise.all(daysResponse.data.value
      .filter(day => day.folder)
      .map(async day => {
        const timesResponse = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${day.name}:/children?$filter=folder ne null`);
        
        // For each time slot, get its batches
        const times = await Promise.all(timesResponse.data.value
          .filter(time => time.folder)
          .map(async time => {
            const batchesResponse = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${day.name}/${time.name}:/children?$filter=folder ne null`);
            
            return {
              name: time.name,
              batches: batchesResponse.data.value
                .filter(batch => batch.folder)
                .map(batch => batch.name)
            };
          }));

        return {
          name: day.name,
          times
        };
      }));

    // Cache with a longer TTL since structure changes less frequently
    cache.set(cacheKey, structure, TTL.COURSES * 2);
    return structure;
  } catch (error) {
    console.error('Error fetching folder structure:', error);
    throw error;
  }
};

const getCourseImages = async (day, time, batch) => {
  const cacheKey = `course_images_${day}_${time}_${batch}`;
  const cachedImages = cache.get(cacheKey);
  
  if (cachedImages) return cachedImages;

  const shareId = getShareId();
  const path = `${day}/${time}/${batch}`;
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${path}?expand=children(expand=thumbnails)`);
  
  const images = response.data.children
    .filter(item => item.image)
    .map(item => ({
      [item.name]: item.thumbnails[0].large.url.replace(/width=\d+&height=\d+/, 'width=480&height=480')
    }));

  cache.set(cacheKey, images, TTL.COURSES);
  return images;
};

// Updated to handle full paths directly
const getImageLinks = async (fullPaths) => {
  const cacheKey = `image_links_${fullPaths.join(',')}`;
  const cachedLinks = cache.get(cacheKey);
  
  if (cachedLinks) return cachedLinks;

  const shareId = getShareId();
  try {
    const links = await Promise.all(
      fullPaths.map(async (path) => {
        const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${path}`);
        return {
          name: path,
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
