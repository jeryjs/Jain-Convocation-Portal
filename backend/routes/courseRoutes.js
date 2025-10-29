const express = require('express');
const router = express.Router();
const { getCourseFolders, getCourseImages, getImageLinks } = require('../services/gdrive');
const { log } = require('../utils/logUtils');

// Route to get list of courses (OneDrive folders)
router.get('/courses', async (req, res) => {
  try {
    log('info', 'FetchingStructure', { message: 'Starting folder structure fetch' });
    const courses = await getCourseFolders();
    log('success', 'FetchStructure', { 
      days: courses.length,
      times: courses.reduce((acc, day) => acc + day.times.length, 0),
      batches: courses.reduce((acc, day) => 
        acc + day.times.reduce((tacc, time) => tacc + time.batches.length, 0), 0)
    });
    res.json(courses);
  } catch (error) {
    log('error', 'FetchStructureFailed', { error: error.message });
    res.status(500).send('Failed to retrieve folder structure');
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

// Route to get all images in a course folder by day, time, and batch
router.get('/courses/:day/:time/:batch', async (req, res) => {
  const { day, time, batch } = req.params;
  try {
    const images = await getCourseImages(day, time, batch);
    log('success', 'FetchCourseImages', { day, time, batch, count: images.length });
    res.json(images);
  } catch (error) {
    log('error', 'FetchCourseImagesFailed', { day, time, batch, error: error.message });
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
