import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { logger } from "../utils/logger";

export function registerBriefingRoutes(app: Express): void {
  app.get("/api/briefing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userName = req.user.claims.first_name 
        ? `${req.user.claims.first_name} ${req.user.claims.last_name || ""}`.trim()
        : userEmail?.split("@")[0] || "User";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekFromNowStr = weekFromNow.toISOString().split("T")[0];

      const allTasks = await storage.getTasks();
      const allMatters = await storage.getMatters();
      const allClients = await storage.getClients();
      const myTasks = allTasks.filter(task => 
        (task.owner && task.owner.id === userId) ||
        (Array.isArray(task.assignees) && task.assignees.some(a => a.id === userId))
      );

      const dueTodayTasks = myTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = task.dueDate.split("T")[0];
        return dueDate === todayStr && task.status !== "done";
      });

      const overdueTasks = myTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < today && task.status !== "done";
      });

      const upcomingDeadlines = myTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = task.dueDate.split("T")[0];
        return dueDate > todayStr && dueDate <= weekFromNowStr && task.status !== "done";
      }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

      const criticalTasks = myTasks.filter(task => 
        task.priority === "critical" && task.status !== "done"
      );

      const highPriorityTasks = myTasks.filter(task => 
        task.priority === "high" && task.status !== "done"
      );

      const inProgressTasks = myTasks.filter(task => 
        task.status === "working-on-it"
      );

      const pendingReviewTasks = myTasks.filter(task => 
        task.status === "pending-review"
      );

      const recentlyCompletedTasks = myTasks
        .filter(task => task.status === "done")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      const activeMatters = allMatters.filter(m => m.status === "active");
      
      const myMatters = activeMatters.filter(matter =>
        Array.isArray(matter.assignedAttorneys) && 
        matter.assignedAttorneys.some(a => a.id === userId)
      );

      const completedToday = myTasks.filter(task => {
        if (task.status !== "done" || !task.updatedAt) return false;
        const updated = task.updatedAt.split("T")[0];
        return updated === todayStr;
      }).length;

      const totalActive = myTasks.filter(t => t.status !== "done").length;
      const completionRate = myTasks.length > 0 
        ? Math.round((myTasks.filter(t => t.status === "done").length / myTasks.length) * 100)
        : 0;

      const greeting = getGreeting();

      res.json({
        user: {
          id: userId,
          name: userName,
          email: userEmail,
        },
        greeting,
        date: today.toLocaleDateString("en-US", { 
          weekday: "long", 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        }),
        summary: {
          totalActiveTasks: totalActive,
          completedToday,
          overdue: overdueTasks.length,
          dueToday: dueTodayTasks.length,
          upcomingDeadlines: upcomingDeadlines.length,
          criticalItems: criticalTasks.length,
          completionRate,
          activeMatters: myMatters.length,
          totalMatters: activeMatters.length,
          totalClients: allClients.length,
        },
        tasks: {
          overdue: overdueTasks.slice(0, 5),
          dueToday: dueTodayTasks.slice(0, 5),
          upcoming: upcomingDeadlines.slice(0, 5),
          critical: criticalTasks.slice(0, 5),
          highPriority: highPriorityTasks.slice(0, 5),
          inProgress: inProgressTasks.slice(0, 5),
          pendingReview: pendingReviewTasks.slice(0, 5),
          recentlyCompleted: recentlyCompletedTasks,
        },
        matters: myMatters.slice(0, 5),
        recentAutomations: [],
      });
    } catch (error) {
      logger.error("Error fetching briefing:", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch briefing data" });
    }
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
