const axios = require('axios');

const getCourseFolders = async () => {
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${process.env.ONEDRIVE_SHAREID}/root/children`);
  const data = response.data;

  return data.value.map(folder => folder.name);
};

const getCourseImages = async (course) => {
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${process.env.ONEDRIVE_SHAREID}/root:/${course}?expand=children(expand=thumbnails)`);
  const data = response.data;

  return data.children.filter(item => item.image).map(item => ({ [item.name]: item.thumbnails[0].large.url }));
};

const getImageLink = async (course, image) => {
  const response = await axios.get(`https://api.onedrive.com/v1.0/shares/s!${process.env.ONEDRIVE_SHAREID}/root:/${course}/${image}`);
  const data = response.data;

  return data['@content.downloadUrl'];
};

module.exports = { getCourseFolders, getCourseImages, getImageLink };
