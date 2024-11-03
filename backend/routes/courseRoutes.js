const express = require('express');
const router = express.Router();
const { getCourseFolders, getCourseImages, getImageLink } = require('../services/onedrive');
const db = require('../config/firebase');

// Route to get list of courses (OneDrive folders)
router.get('/courses', async (req, res) => {
  console.log('courses requested');

  try {
    const courses = await getCourseFolders();
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to retrieve courses');
  }
});

// Route to get all images in a course folder
router.get('/courses/:course', async (req, res) => {
  const course = req.params.course;

  console.log(`images requested: ${course}`);

  try {
    const images = await getCourseImages(course);
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to retrieve images');
  }
});

// Route to get image download link
router.get('/courses/:course/:image', async (req, res) => {
  const course = req.params.course;
  const image = req.params.image;

  console.log(`content requested: ${course}/${image}`);

  try {
    const link = await getImageLink(course, image);
    res.json({ link });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to retrieve image link');
  }
});

// Route to submit a request for images
router.post('/courses/:course/request', async (req, res) => {
  const { username, requestedImages, requestType, paymentProof } = req.body;
  const course = req.params.course;

  console.log(`request submitted: ${course}`);

  try {
    await db.collection('requests').add({
      username,
      course,
      requestedImages,
      requestType,
      paymentProof,
      status: 'pending',
    });
    res.send('Request submitted successfully');
  } catch (error) {
    console.error('Request submission error:', error);
    res.status(500).send('Failed to submit request');
  }
});

module.exports = router;
