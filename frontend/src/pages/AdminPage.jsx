import React from 'react';
import PageHeader from '../components/PageHeader';

function AdminPage() {
  return (
    <>
    <PageHeader
      pageTitle="Admin Dashboard"
      pageSubtitle="Manage student requests"
      breadcrumbs={['Admin']}
    />
    </>
  );
}

export default AdminPage;