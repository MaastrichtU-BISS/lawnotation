<template>
  <main class="pb-10">
    <div class="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-800">Dashboard overview</h1>
        <p class="mt-1 text-sm text-slate-500">Explore completion and workload across projects and tasks.</p>
      </div>
      <div v-if="!isEmpty" class="w-full overflow-hidden rounded-xl border border-primary-600 bg-white shadow-sm md:w-[420px]">
        <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2 p-2">
          <select v-model="projectFilter" class="w-full min-w-0 rounded-lg border border-primary-600 bg-white px-3 py-2 text-sm text-slate-700" aria-label="Filter by project">
            <option value="">All projects</option>
            <option v-for="project in projectOptions" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
          <select v-model="taskFilter" class="w-full min-w-0 rounded-lg border border-primary-600 bg-white px-3 py-2 text-sm text-slate-700" aria-label="Filter by task">
            <option value="">All tasks</option>
            <option v-for="task in taskOptions" :key="task.id" :value="task.id">{{ task.name }}</option>
          </select>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="!projectFilter && !taskFilter"
            title="Clear all filters"
            aria-label="Clear all filters"
            @click="clearFilters"
          >
            <i class="pi pi-times text-sm"></i>
          </button>
        </div>
      </div>
      <div v-if="initial" class="inline-flex rounded-xl bg-slate-100">
        <button
          v-for="option in roles"
          :key="option.value"
          type="button"
          :aria-pressed="role === option.value"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition"
          :class="role === option.value ? 'bg-primary-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'"
          @click="role = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="initialError || switchError" class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-700">
      <p>Could not load the dashboard data.</p>
      <button
        type="button"
        class="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
        @click="initialError ? retryInitial() : loadRole(role)"
      >
        Try again
      </button>
    </div>

    <div v-else-if="loading" class="mt-5 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading dashboard data...</div>

    <div v-else-if="isEmpty" class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <i :class="emptyState.icon" class="text-xl"></i>
      </span>
      <h2 class="mt-4 font-bold text-slate-800">{{ emptyState.title }}</h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">{{ emptyState.text }}</p>
    </div>

    <template v-else>
      <section class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <article v-for="card in summaryCards" :key="card.label" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-500">{{ card.label }}</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-xl" :class="card.iconClass">
              <i :class="card.icon" class="text-sm"></i>
            </span>
          </div>
          <p class="mt-3 text-3xl font-bold tracking-tight text-slate-800">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ card.detail }}</p>
        </article>
      </section>

      <section class="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-bold text-slate-800">Completion</h2>
              <p class="text-sm text-slate-500">Done versus pending assignments</p>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-8">
            <div
              class="grid h-36 w-36 shrink-0 place-items-center rounded-full"
              :style="{ background: `conic-gradient(#22c55e 0 ${completionPercent}%, #fb7185 ${completionPercent}% 100%)` }"
            >
              <div class="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                <div>
                  <p class="text-2xl font-bold text-slate-800">{{ completionPercent }}%</p>
                  <p class="text-xs text-slate-400">complete</p>
                </div>
              </div>
            </div>
            <div class="min-w-0 flex-1 space-y-4">
              <div>
                <div class="mb-1 flex justify-between text-sm"><span class="font-medium text-slate-600">Done</span><b>{{ doneCount }} / {{ filteredAssignments.length }}</b></div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-emerald-500" :style="{ width: `${completionPercent}%` }"></div></div>
              </div>
       
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="font-bold text-slate-800">Confidence</h2>
          <p class="text-sm text-slate-500">Average annotator confidence</p>
          <div class="mt-5 flex items-end gap-2">
            <p class="text-4xl font-bold text-slate-800">{{ averageConfidence }}</p>
            <p class="mb-1 text-sm text-slate-400">/ 5</p>
          </div>
          <div class="mt-5 space-y-2">
            <div v-for="level in 5" :key="level" class="grid grid-cols-[72px_1fr_28px] items-center gap-2 text-xs">
              <span class="flex gap-0.5" role="img" :aria-label="`${level} star${level > 1 ? 's' : ''}`">
                <i
                  v-for="star in level"
                  :key="star"
                  class="pi pi-star-fill text-[11px] text-amber-400"
                  aria-hidden="true"
                ></i>
              </span>
              <div class="h-2 rounded-full bg-slate-100"><div class="h-full rounded-full bg-amber-400" :style="{ width: `${confidencePercent(level)}%` }"></div></div>
              <b class="text-right text-slate-600">{{ confidenceCount(level) }}</b>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-5 grid gap-5 lg:grid-cols-2">
        <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 class="font-bold text-slate-800">Project breakdown</h2><p class="text-sm text-slate-500">Workload by project</p></div>
          </div>
          <!-- 5 rows of 72px + 4 dividers = 364px; scrolls from the 6th row on -->
          <div class="max-h-[364px] divide-y divide-slate-100 overflow-y-auto">
            <button
              v-for="item in projectBreakdown"
              :key="item.id"
              type="button"
              class="block w-full px-5 py-4 text-left transition"
              :class="projectFilter === item.id ? '' : 'hover:bg-slate-50'"
              :style="projectFilter === item.id ? selectedProjectStyle(item.id) : undefined"
              @click="toggleProject(item.id)"
            >
              <div class="mb-2 flex items-center justify-between gap-4">
                <span class="truncate font-semibold text-slate-700">{{ item.name }}</span>
                <span class="shrink-0 text-sm text-slate-500">{{ item.done }}/{{ item.total }} done</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: `${item.percent}%`, backgroundColor: projectColor(item.id).base }"></div></div>
            </button>
            <p v-if="!projectBreakdown.length" class="px-5 py-8 text-center text-sm text-slate-400">No project data available</p>
          </div>
        </article>

        <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 class="font-bold text-slate-800">Task breakdown</h2><p class="text-sm text-slate-500">Completion by task</p></div>
          </div>
          <!-- 5 rows of 72px + 4 dividers = 364px; scrolls from the 6th row on -->
          <div class="max-h-[364px] divide-y divide-slate-100 overflow-y-auto">
            <button
              v-for="item in taskBreakdown"
              :key="item.id"
              type="button"
              class="block w-full px-5 py-4 text-left transition"
              :class="taskFilter === item.id ? '' : 'hover:bg-slate-50'"
              :style="taskFilter === item.id ? selectedTaskStyle(item) : undefined"
              @click="toggleTask(item.id)"
            >
              <div class="mb-2 flex items-center justify-between gap-4">
                <span class="truncate font-semibold text-slate-700">{{ item.name }}</span>
                <span class="shrink-0 text-sm text-slate-500">{{ item.done }}/{{ item.total }} done</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: `${item.percent}%`, backgroundColor: projectColor(item.projectId).base }"></div></div>
            </button>
            <p v-if="!taskBreakdown.length" class="px-5 py-8 text-center text-sm text-slate-400">No task data available</p>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ["auth"] });

type BreakdownAssignment = {
  id: number;
  annotator_id: string | null;
  status: string;
  difficulty_rating: number;
  document: { id: number; name: string } | null;
  task: { id: number; name: string; project?: { id: number; name: string } | null } | null;
};

type Role = "editor" | "annotator";

const { $trpc } = useNuxtApp();
const roles = [
  { value: "editor" as const, label: "Editor view" },
  { value: "annotator" as const, label: "Annotator view" },
];

// Runs during SSR, so the HTML already shows the right view with its data:
// first the cheap role check, then only that role's assignments.
const {
  data: initial,
  error: initialError,
  refresh: retryInitial,
} = await useAsyncData("dashboard-initial", async () => {
  const initialRole = await $trpc.assignment.getDashboardRole.query();
  const assignments = await $trpc.assignment.findDashboardAssignments.query(initialRole);
  return { role: initialRole, assignments: assignments as BreakdownAssignment[] };
});

const role = ref<Role>(initial.value?.role ?? "editor");
// null = not loaded yet. The other role is fetched the first time it is opened.
const assignmentsByRole = reactive<Record<Role, BreakdownAssignment[] | null>>({
  editor: null,
  annotator: null,
});
const switchError = ref<Role | null>(null);
const projectFilter = ref<number | "">("");
const taskFilter = ref<number | "">("");

watch(
  initial,
  (value) => {
    if (!value) return;
    assignmentsByRole[value.role] = value.assignments;
    role.value = value.role;
  },
  { immediate: true },
);

const loadRole = async (value: Role) => {
  if (assignmentsByRole[value]) return;
  switchError.value = null;
  try {
    assignmentsByRole[value] = (await $trpc.assignment.findDashboardAssignments.query(value)) as BreakdownAssignment[];
  } catch {
    if (role.value === value) switchError.value = value;
  }
};

const loading = computed(() => !initialError.value && !switchError.value && assignmentsByRole[role.value] === null);
const roleAssignments = computed(() => assignmentsByRole[role.value] ?? []);

const isEmpty = computed(() => !loading.value && roleAssignments.value.length === 0);

const emptyState = computed(() =>
  role.value === "editor"
    ? {
        icon: "pi pi-folder-plus",
        title: "No projects yet",
        text: "Create a project, upload documents and assign tasks to annotators. Their progress will appear here.",
      }
    : {
        icon: "pi pi-inbox",
        title: "No assignments yet",
        text: "You haven't been assigned to any tasks yet. Once an editor assigns you a task, your progress will appear here.",
      },
);

watch(role, (value) => {
  projectFilter.value = "";
  taskFilter.value = "";
  switchError.value = null;
  if (initial.value) loadRole(value);
});

function clearFilters() {
  projectFilter.value = "";
  taskFilter.value = "";
}

const projectOptions = computed(() => {
  const map = new Map<number, string>();
  for (const assignment of roleAssignments.value) {
    const project = assignment.task?.project;
    if (project) map.set(project.id, project.name);
  }
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
});

const taskOptions = computed(() => {
  const map = new Map<number, string>();
  for (const assignment of roleAssignments.value) {
    const task = assignment.task;
    if (projectFilter.value && task?.project?.id !== projectFilter.value) continue;
    if (task) map.set(task.id, task.name);
  }
  return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
});

watch(projectFilter, (projectId) => {
  if (!projectId) {
    taskFilter.value = "";
    return;
  }

  if (
    taskFilter.value &&
    !roleAssignments.value.some(
      (assignment) => assignment.task?.id === taskFilter.value && assignment.task?.project?.id === projectId,
    )
  ) {
    taskFilter.value = "";
  }
});

watch(taskFilter, (taskId) => {
  if (!taskId) return;
  const task = roleAssignments.value.find((assignment) => assignment.task?.id === taskId)?.task;
  if (task?.project) projectFilter.value = task.project.id;
});

const breakdownColors = [
  { base: "#3b82f6", light: "#eff6ff" },
  { base: "#8b5cf6", light: "#f5f3ff" },
  { base: "#10b981", light: "#ecfdf5" },
  { base: "#f59e0b", light: "#fffbeb" },
  { base: "#f43f5e", light: "#fff1f2" },
  { base: "#06b6d4", light: "#ecfeff" },
];

const projectColor = (projectId: number) =>
  breakdownColors[Math.abs(projectId) % breakdownColors.length] ?? breakdownColors[0]!;

const selectedProjectStyle = (projectId: number) => {
  const color = projectColor(projectId);
  return {
    backgroundColor: color.light,
    boxShadow: `inset 4px 0 0 ${color.base}`,
  };
};

const selectedTaskStyle = (item: { projectId: number }) => {
  const color = projectColor(item.projectId);
  return {
    backgroundColor: color.light,
    boxShadow: `inset 4px 0 0 ${color.base}`,
  };
};

const toggleProject = (projectId: number) => {
  projectFilter.value = projectFilter.value === projectId ? "" : projectId;
};

const toggleTask = (taskId: number) => {
  taskFilter.value = taskFilter.value === taskId ? "" : taskId;
};

const filteredAssignments = computed(() =>
  roleAssignments.value.filter((assignment) => {
    if (projectFilter.value && assignment.task?.project?.id !== projectFilter.value) return false;
    if (taskFilter.value && assignment.task?.id !== taskFilter.value) return false;
    return true;
  }),
);

const doneCount = computed(() => filteredAssignments.value.filter((assignment) => assignment.status === "done").length);
const pendingCount = computed(() => filteredAssignments.value.length - doneCount.value);
const completionPercent = computed(() =>
  filteredAssignments.value.length ? Math.round(doneCount.value / filteredAssignments.value.length * 100) : 0,
);

const documentCount = computed(() =>
  new Set(
    filteredAssignments.value
      .map((assignment) => assignment.document?.id)
      .filter((id): id is number => Boolean(id)),
  ).size,
);

const averageConfidence = computed(() => {
  const rated = filteredAssignments.value.filter((assignment) => assignment.difficulty_rating > 0);
  if (!rated.length) return "0.0";
  return (rated.reduce((sum, assignment) => sum + assignment.difficulty_rating, 0) / rated.length).toFixed(1);
});

const confidenceCount = (level: number) =>
  filteredAssignments.value.filter((assignment) => assignment.difficulty_rating === level).length;
const confidencePercent = (level: number) => {
  const max = Math.max(...[1, 2, 3, 4, 5].map(confidenceCount), 1);
  return confidenceCount(level) / max * 100;
};

const summaryCards = computed(() => [
  {
    label: "Projects",
    value: projectOptions.value.length,
    detail: role.value === "editor" ? "Owned projects" : "Assigned projects",
    icon: "pi pi-folder",
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    label: "Tasks",
    value: taskOptions.value.length,
    detail: "Across selected scope",
    icon: "pi pi-list-check",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    label: "Documents",
    value: documentCount.value,
    detail: "Unique documents in scope",
    icon: "pi pi-file",
    iconClass: "bg-amber-50 text-amber-600",
  },
]);

const projectBreakdown = computed(() => {
  const map = new Map<number, { id: number; name: string; done: number; total: number }>();
  for (const assignment of roleAssignments.value) {
    const project = assignment.task?.project;
    if (!project) continue;
    const item = map.get(project.id) ?? { id: project.id, name: project.name, done: 0, total: 0 };
    item.total++;
    if (assignment.status === "done") item.done++;
    map.set(project.id, item);
  }
  return [...map.values()].map((item) => ({ ...item, percent: item.total ? Math.round(item.done / item.total * 100) : 0 }));
});

const taskBreakdown = computed(() => {
  const map = new Map<number, { id: number; name: string; projectId: number; done: number; total: number }>();
  for (const assignment of roleAssignments.value) {
    if (projectFilter.value && assignment.task?.project?.id !== projectFilter.value) continue;
    const task = assignment.task;
    if (!task) continue;
    const item = map.get(task.id) ?? {
      id: task.id,
      name: task.name,
      projectId: assignment.task?.project?.id ?? 0,
      done: 0,
      total: 0,
    };
    item.total++;
    if (assignment.status === "done") item.done++;
    map.set(task.id, item);
  }
  return [...map.values()].map((item) => ({ ...item, percent: item.total ? Math.round(item.done / item.total * 100) : 0 }));
});

</script>
