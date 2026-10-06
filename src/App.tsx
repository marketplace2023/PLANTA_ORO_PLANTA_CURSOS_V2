import { Navigate, Route, Routes } from 'react-router-dom'
import { Failed, Loading, Panel } from '@/components/kit'
import { Shell } from '@/components/shell'
import { useAuth } from '@/features/auth/auth-context'
import { useOwner } from '@/features/owners/owner-context'
import { CourseDetailPage } from '@/pages/course-detail-page'
import { CoursesPage } from '@/pages/courses-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { LoginPage } from '@/pages/login-page'
import { OnboardingPage } from '@/pages/onboarding-page'
import { StudentsPage } from '@/pages/students-page'

/** Sin sesión → login. Sin organización que ofrezca cursos → registrar la suya. Con una → el portal. */
function PortalArea() {
  const { status } = useAuth()
  const { owner, isLoading, isError } = useOwner()
  if (status === 'loading' || isLoading) return <div className="p-8"><Loading rows={4} /></div>
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (isError) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Panel><Failed what="tus organizaciones" onRetry={() => window.location.reload()} /></Panel>
      </div>
    )
  }
  if (!owner) return <OnboardingPage />
  return <Shell />
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<PortalArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
