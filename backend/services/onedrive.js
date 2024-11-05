const axios = require('axios');
const { getSettings } = require('../config/settings');

const getShareId = () => {
  const settings = getSettings();
  return settings.courses?.folderId || process.env.ONEDRIVE_SHAREID;
};

const getCourseFolders = async () => {
  const shareId = getShareId();
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root/children`);
  const data = response.data;

  return data.value
    .filter(folder => folder.folder && folder.folder.childCount > 0)
    .map(folder => folder.name);
};

const getCourseImages = async (course) => {
  const shareId = getShareId();
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${shareId}/root:/${course}?expand=children(expand=thumbnails)`);
  const data = response.data;

  return data.children.filter(item => item.image).map(item => ({ [item.name]: item.thumbnails[0].large.url }));
};

const getImageLinks = async (course, images) => {
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
    return links;
  } catch (error) {
    console.error('Error getting image links:', error);
    throw error;
  }
};

module.exports = { getCourseFolders, getCourseImages, getImageLinks };
