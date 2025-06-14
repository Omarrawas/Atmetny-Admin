import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserTable } from "@/components/UserTable";
import { BookCopy, HelpCircle, ScrollText, Users } from "lucide-react";
import { getUsers, getTotalSubjectsCount, getTotalQuestionsCount, getTotalExamsCount, getTotalUsersCount } from "@/lib/firestore";
import type { User } from "@/types";

async function getStats() {
  const [subjectsCount, questionsCount, examsCount, usersCount] = await Promise.all([
    getTotalSubjectsCount(),
    getTotalQuestionsCount(),
    getTotalExamsCount(),
    getTotalUsersCount(),
  ]);
  return { subjectsCount, questionsCount, examsCount, usersCount };
}

export default async function DashboardPage() {
  const stats = await getStats();
  const users: User[] = await getUsers();

  const statItems = [
    { title: "إجمالي المواد", value: stats.subjectsCount, icon: BookCopy, color: "text-blue-500" },
    { title: "إجمالي الأسئلة", value: stats.questionsCount, icon: HelpCircle, color: "text-green-500" },
    { title: "إجمالي الامتحانات", value: stats.examsCount, icon: ScrollText, color: "text-purple-500" },
    { title: "إجمالي المستخدمين", value: stats.usersCount, icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="mb-8 text-3xl font-bold font-headline text-center md:text-right">لوحة التحكم الرئيسية</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statItems.map((item) => (
          <Card key={item.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">إدارة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable initialUsers={users} />
        </CardContent>
      </Card>
    </div>
  );
}

export const revalidate = 60; // Revalidate data every 60 seconds
