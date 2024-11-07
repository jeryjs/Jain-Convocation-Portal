const express = require('express');
const router = express.Router();
const { getCourseFolders, getCourseImages, getImageLinks } = require('../services/onedrive');
const { log } = require('../utils/logUtils');

// Route to get list of courses (OneDrive folders)
router.get('/courses', async (req, res) => {
  try {
    const courses = await getCourseFolders();
    log('success', 'FetchCourses', { count: courses.length });
    res.json(courses);
  } catch (error) {
    log('error', 'FetchCoursesFailed', { error: error.message });
    res.status(500).send('Failed to retrieve courses');
  }
});

// Route to get all images in a course folder
router.get('/courses/:course', async (req, res) => {
  const course = req.params.course;
  try {
    const images = await getCourseImages(course);
    log('success', 'FetchCourseImages', { course, count: images.length });
    res.json(images);
  } catch (error) {
    log('error', 'FetchCourseImagesFailed', { course, error: error.message });
    res.status(500).send('Failed to retrieve images');
  }
});

// Route to get image download links
router.get('/images/:paths(*)', async (req, res) => {
  const paths = req.params.paths.split(',').map(path => decodeURIComponent(path));
  log('info', 'FetchingImageLinks', { count: paths.length });

  try {
    const links = await getImageLinks(paths);
    log('success', 'ImageLinksFetched', { count: links.length });
    res.json({ links });
  } catch (error) {
    log('error', 'FetchImageLinksFailed', { error: error.message });
    res.status(500).send('Failed to retrieve image links');
  }
});

module.exports = router;
