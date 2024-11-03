import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, CircularProgress, Grid } from '@mui/material';
import config from '../config';
import PageHeader from '../components/PageHeader';

function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.API_BASE_URL}/courses`);
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) return <CircularProgress style={{ margin: 'auto', display: 'block' }} />;

  return (
    <>
    <PageHeader 
      pageTitle="Courses"
      pageSubtitle="Select your course from the options below"
      breadcrumbs={['Courses']}
    />
    <Grid container spacing={2} padding={3}>
      {courses.map((course) => (
        <Grid item xs={12} sm={6} md={4} key={course}>
          <Card onClick={() => navigate(`/courses/${course}`)} style={{ cursor: 'pointer', transition: '0.3s' }}>
            <CardContent>
              <Typography variant="h6" align="center">
                {course}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
    </>
  );
}

export default CoursesPage;
