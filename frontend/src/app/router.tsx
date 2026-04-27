import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@components/layout/MainLayout';
import UserStartPage from '@features/users/UserStartPage';
import UserDashboard from '@features/dashboard/UserDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/users" replace />,
      },
      {
        path: '/users',
        element: <UserStartPage />,
      },
      {
        path: '/users/:userId/dashboard',
        element: <UserDashboard />,
      },
      {
        path: '/users/:userId/exams/new',
        element: <div>New Exam (Coming Soon)</div>,
      },
      {
        path: '/users/:userId/exams/:examId/instructions',
        element: <div>Exam Instructions (Coming Soon)</div>,
      },
      {
        path: '/users/:userId/exams/:examId/take/:questionIndex',
        element: <div>Active Exam (Coming Soon)</div>,
      },
      {
        path: '/users/:userId/exams/:examId/report',
        element: <div>Exam Report (Coming Soon)</div>,
      },
      {
        path: '/users/:userId/exams/:examId/review',
        element: <div>Exam Review (Coming Soon)</div>,
      },
      {
        path: '/admin/questions',
        element: <div>Question Editor (Coming Soon)</div>,
      },
      {
        path: '/admin/modules',
        element: <div>Module Management (Coming Soon)</div>,
      },
      {
        path: '/admin/topics',
        element: <div>Topic Management (Coming Soon)</div>,
      },
      {
        path: '/admin/import-export',
        element: <div>Import/Export (Coming Soon)</div>,
      },
      {
        path: '*',
        element: <Navigate to="/users" replace />,
      },
    ],
  },
]);
