import { useState, useMemo, useEffect } from 'react';
import { format, isToday, isSameDay, subDays, startOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Flame, Plus, Target, TrendingUp, Calendar, Trophy, Loader2 } from 'lucide-react';
import type { Habits, HabitLogs } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';

const HABIT_COLORS = [
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#EF4444', label: 'Red' },
  { value: '#06B6D4', label: 'Cyan' },
];

const HABIT_ICONS = ['🧘', '💪', '📚', '💧', '✍️', '🎯', '🏃', '🎨', '🎵', '💤', '🥗', '💊'];

export default function Dashboard() {
  const [habits, setHabits] = useState<Habits[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newHabitOpen, setNewHabitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    icon: '🎯',
  });

  const todayStr = format(selectedDate, 'yyyy-MM-dd');

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [habitsData, logsData] = await Promise.all([
          LivingAppsService.getHabits(),
          LivingAppsService.getHabitLogs(),
        ]);
        setHabits(habitsData);
        setHabitLogs(logsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Get logs for selected date
  const todayLogs = useMemo(() => {
    return habitLogs.filter(log => log.fields.date === todayStr);
  }, [habitLogs, todayStr]);

  // Calculate streak for a habit
  const getStreak = (habitId: string): number => {
    const sortedLogs = habitLogs
      .filter(log => {
        const logHabitId = extractRecordId(log.fields.habit_id);
        return logHabitId === habitId && log.fields.completed;
      })
      .sort((a, b) => new Date(b.fields.date || '').getTime() - new Date(a.fields.date || '').getTime());

    if (sortedLogs.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = format(subDays(today, i), 'yyyy-MM-dd');
      const hasLog = sortedLogs.some(log => log.fields.date === checkDate);
      if (hasLog) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  };

  // Get completion status for a habit on selected date
  const isCompleted = (habitId: string): boolean => {
    const log = todayLogs.find(l => extractRecordId(l.fields.habit_id) === habitId);
    return log?.fields.completed ?? false;
  };

  // Get log record for a habit on selected date
  const getLogForHabit = (habitId: string): HabitLogs | undefined => {
    return todayLogs.find(l => extractRecordId(l.fields.habit_id) === habitId);
  };

  // Toggle habit completion
  const toggleHabit = async (habitId: string) => {
    const existingLog = getLogForHabit(habitId);
    const habitUrl = createRecordUrl(APP_IDS.HABITS, habitId);

    try {
      if (existingLog) {
        // Update existing log
        await LivingAppsService.updateHabitLog(existingLog.record_id, {
          completed: !existingLog.fields.completed,
        });
        setHabitLogs(prev =>
          prev.map(log =>
            log.record_id === existingLog.record_id
              ? { ...log, fields: { ...log.fields, completed: !log.fields.completed } }
              : log
          )
        );
      } else {
        // Create new log
        await LivingAppsService.createHabitLog({
          habit_id: habitUrl,
          date: todayStr,
          completed: true,
          notes: '',
        });
        // Refresh logs to get the new one with proper record_id
        const updatedLogs = await LivingAppsService.getHabitLogs();
        setHabitLogs(updatedLogs);
      }
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  };

  // Add new habit
  const addHabit = async () => {
    if (!newHabit.name.trim()) return;
    setSaving(true);

    try {
      await LivingAppsService.createHabit({
        name: newHabit.name,
        description: newHabit.description,
        frequency: 'daily',
        target_count: 1,
        color: newHabit.color,
        icon: newHabit.icon,
        created_at: format(new Date(), 'yyyy-MM-dd'),
      });

      // Refresh habits list
      const updatedHabits = await LivingAppsService.getHabits();
      setHabits(updatedHabits);

      setNewHabit({ name: '', description: '', color: '#8B5CF6', icon: '🎯' });
      setNewHabitOpen(false);
    } catch (error) {
      console.error('Failed to add habit:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const completedToday = todayLogs.filter(l => l.fields.completed).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const longestStreak = Math.max(...habits.map(h => getStreak(h.record_id)), 0);

  // Get week days for the mini calendar
  const weekDays = useMemo(() => {
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  // Get completion percentage for a specific date
  const getDateCompletion = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const logs = habitLogs.filter(l => l.fields.date === dateStr);
    const completed = logs.filter(l => l.fields.completed).length;
    return totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-slate-500">Loading your habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Habit Tracker</h1>
            <p className="text-slate-500 mt-1">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </p>
          </div>
          <Dialog open={newHabitOpen} onOpenChange={setNewHabitOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Habit Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Morning Meditation"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., 10 minutes of mindfulness"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={newHabit.icon}
                      onValueChange={(value) => setNewHabit(prev => ({ ...prev, icon: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HABIT_ICONS.map(icon => (
                          <SelectItem key={icon} value={icon}>
                            <span className="text-xl">{icon}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={newHabit.color}
                      onValueChange={(value) => setNewHabit(prev => ({ ...prev, color: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HABIT_COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addHabit} className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Habit'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedToday}/{totalHabits}</p>
                  <p className="text-sm text-slate-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                  <p className="text-sm text-slate-500">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{longestStreak}</p>
                  <p className="text-sm text-slate-500">Best Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{habits.length}</p>
                  <p className="text-sm text-slate-500">Habits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Week Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const completion = getDateCompletion(day);
                const isSelected = isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      flex flex-col items-center p-2 rounded-lg transition-all
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-100'}
                      ${today && !isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                    `}
                  >
                    <span className="text-xs font-medium opacity-70">
                      {format(day, 'EEE')}
                    </span>
                    <span className="text-lg font-bold">
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 w-full">
                      <Progress
                        value={completion}
                        className={`h-1 ${isSelected ? 'bg-primary-foreground/30' : ''}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Habits List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Habits</CardTitle>
            <CardDescription>
              Check off habits as you complete them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {habits.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No habits yet. Create your first habit to get started!</p>
              </div>
            ) : (
              habits.map((habit) => {
                const completed = isCompleted(habit.record_id);
                const streak = getStreak(habit.record_id);
                const color = habit.fields.color || '#8B5CF6';
                const icon = habit.fields.icon || '🎯';

                return (
                  <div
                    key={habit.record_id}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border transition-all
                      ${completed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300'}
                    `}
                  >
                    <Checkbox
                      checked={completed}
                      onCheckedChange={() => toggleHabit(habit.record_id)}
                      className="h-6 w-6"
                      style={{
                        borderColor: completed ? color : undefined,
                        backgroundColor: completed ? color : undefined,
                      }}
                    />
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {habit.fields.name}
                      </p>
                      {habit.fields.description && (
                        <p className="text-sm text-slate-500 truncate">
                          {habit.fields.description}
                        </p>
                      )}
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700">{streak}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Daily Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Daily Progress</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
              {completionRate === 100 && (
                <p className="text-sm text-emerald-600 font-medium text-center mt-2">
                  Perfect day! All habits completed!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
