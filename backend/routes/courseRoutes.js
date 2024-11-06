const express = require('express');
const router = express.Router();
const { getCourseFolders, getCourseImages, getImageLinks } = require('../services/onedrive');

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
    console.log(`✅ Found ${images.length} images in ${course}`);
    res.json(images);
  } catch (error) {
    console.error(`❌ Failed to fetch images for ${course}:`, error);
    res.status(500).send('Failed to retrieve images');
  }
});

// Route to get image download links
router.get('/images/:paths(*)', async (req, res) => {
  const paths = req.params.paths.split(',').map(path => decodeURIComponent(path));
  console.log(`🔗 Fetching links for ${paths.length} images:`, paths);

  try {
    const links = await getImageLinks(paths);
    console.log(`✅ Links generated for ${paths.length} images`);
    res.json({ links });
  } catch (error) {
    console.error(`❌ Failed to get links for images:`, error);
    res.status(500).send('Failed to retrieve image links');
  }
});

module.exports = router;
