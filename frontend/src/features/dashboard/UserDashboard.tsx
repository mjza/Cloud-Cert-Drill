import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_USER, GET_USER_STATISTICS } from '@api/queries/users';
import { GET_USER_EXAMS } from '@api/queries/exams';

interface User {
  userId: string;
  name: string;
  createdAt: string;
}

interface UserStatistics {
  totalExams: number;
  averageScore: number;
  lastExamScore: number | null;
  questionsAnswered: number;
  weakTopics: Array<{
    topicId: string;
    topicName: string;
    averageScore: number;
  }>;
  strongTopics: Array<{
    topicId: string;
    topicName: string;
    averageScore: number;
  }>;
}

interface Exam {
  examId: string;
  userId: string;
  module: {
    id: string;
    name: string;
  };
  name: string;
  status: string;
  durationMinutes: number;
  questionCount: number;
  createdAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
}

export default function UserDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: userData, loading: userLoading } = useQuery<{ user: User }>(
    GET_USER,
    { variables: { userId }, skip: !userId }
  );

  const { data: statsData, loading: statsLoading } = useQuery<{ userStatistics: UserStatistics }>(
    GET_USER_STATISTICS,
    { variables: { userId }, skip: !userId }
  );

  const { data: examsData } = useQuery<{ exams: Exam[] }>(
    GET_USER_EXAMS,
    { variables: { userId }, skip: !userId }
  );

  if (userLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const user = userData?.user;
  const stats = statsData?.userStatistics;
  const exams = examsData?.exams || [];

  if (!user || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load user dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
        <p className="mt-1 text-muted-foreground">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Average Score</div>
          <div className="mt-2 text-3xl font-bold">{stats.averageScore.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Exams</div>
          <div className="mt-2 text-3xl font-bold">{stats.totalExams}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Questions Answered</div>
          <div className="mt-2 text-3xl font-bold">{stats.questionsAnswered}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Last Exam</div>
          <div className="mt-2 text-3xl font-bold">{stats.lastExamScore ? `${stats.lastExamScore.toFixed(1)}%` : 'N/A'}</div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate(`/users/${userId}/exams/new`)}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New Exam
        </button>
        <button
          onClick={() => navigate('/admin/questions')}
          className="rounded-md border border-input px-6 py-2 text-sm font-medium hover:bg-accent"
        >
          Edit Questions
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Strong Topics</h2>
          <div className="space-y-2">
            {stats.strongTopics.length > 0 ? (
              stats.strongTopics.map((topic) => (
                <div key={topic.topicId} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <span className="font-medium">{topic.topicName}</span>
                  <span className="text-sm font-semibold text-green-600">{topic.averageScore.toFixed(1)}%</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No strong topics yet</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Topics to Improve</h2>
          <div className="space-y-2">
            {stats.weakTopics.length > 0 ? (
              stats.weakTopics.map((topic) => (
                <div key={topic.topicId} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <span className="font-medium">{topic.topicName}</span>
                  <span className="text-sm font-semibold text-red-600">{topic.averageScore.toFixed(1)}%</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">All topics are looking good!</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Exams</h2>
        {exams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium py-2">Exam Name</th>
                  <th className="text-left font-medium py-2">Module</th>
                  <th className="text-left font-medium py-2">Status</th>
                  <th className="text-right font-medium py-2">Score</th>
                  <th className="text-right font-medium py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.examId} className="border-b hover:bg-muted/50">
                    <td className="py-3">{exam.name}</td>
                    <td className="py-3">{exam.module.name}</td>
                    <td className="py-3 capitalize">{exam.status}</td>
                    <td className="py-3 text-right">{exam.score !== null ? `${exam.score.toFixed(1)}%` : 'N/A'}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {new Date(exam.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No exams yet. Take your first exam to get started!</p>
        )}
      </div>
    </div>
  );
}
