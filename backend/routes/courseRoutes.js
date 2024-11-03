const express = require('express');
const router = express.Router();
const { getCourseFolders, getCourseImages, getImageLink } = require('../services/onedrive');

// Route to get list of courses (OneDrive folders)
router.get('/courses', async (req, res) => {
  console.log('📚 Fetching all courses...');
  
  try {
    const courses = await getCourseFolders();
    console.log(`✅ Found ${courses.length} courses`);
    res.json(courses);
  } catch (error) {
    console.error('❌ Failed to fetch courses:', error);
    res.status(500).send('Failed to retrieve courses');
  }
});

// Route to get all images in a course folder
router.get('/courses/:course', async (req, res) => {
  const course = req.params.course;
  console.log(`📸 Fetching images for course: ${course}`);

  try {
    const images = await getCourseImages(course);
    console.log(`✅ Found ${Object.keys(images).length} images in ${course}`);
    res.json(images);
  } catch (error) {
    console.error(`❌ Failed to fetch images for ${course}:`, error);
    res.status(500).send('Failed to retrieve images');
  }
});

// Route to get image download link
router.get('/courses/:course/:image', async (req, res) => {
  const { course, image } = req.params;
  console.log(`🔗 Fetching link for ${image} in ${course}`);

  try {
    const link = await getImageLink(course, image);
    console.log(`✅ Link generated for ${image}`);
    res.json({ link });
  } catch (error) {
    console.error(`❌ Failed to get link for ${image}:`, error);
    res.status(500).send('Failed to retrieve image link');
  }
});

module.exports = router;
