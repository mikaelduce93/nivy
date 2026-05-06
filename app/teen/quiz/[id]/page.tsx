import { notFound, redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getQuizById } from "@/lib/quiz/server"
import { QuizRunnerClient } from "./quiz-runner-client"

export const dynamic = "force-dynamic"

interface Params {
  params: Promise<{ id: string }>
}

export default async function QuizRunnerPage({ params }: Params) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
    redirect("/auth/redirect")
  }

  const { id } = await params
  const quiz = await getQuizById(id)
  if (!quiz) {
    notFound()
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    notFound()
  }

  return <QuizRunnerClient quiz={quiz} />
}
