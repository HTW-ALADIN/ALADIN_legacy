import { createRouter, createWebHistory } from "vue-router";
import TaskOverview from "@/views/TaskOverview.vue";

const routes = [
  {
    path: "/",
    name: "TaskOverview",
    component: TaskOverview,
  },
  {
    path: "/task/:task",
    name: "Task",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "task" */ "@/views/Task.vue"),
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import(/* webpackChunkName: "settings" */ "@/views/Settings.vue"),
  },
  {
    path: "/editor",
    name: "Editor",
    component: () => import(/* webpackChunkName: "configurator" */ "@/views/Configurator.vue"),
  },
  {
    path: "/replays",
    name: "Replays",
    component: () => import(/* webpackChunkName: "replayoverview" */ "@/views/ReplayOverview.vue"),
  },
  {
    path: "/replays",
    name: "Replays",
    component: () => import(/* webpackChunkName: "settings" */ "@/views/ReplayOverview.vue"),
  },
  {
    path: "/replay/:id",
    name: "Replay",
    component: () => import(/* webpackChunkName: "replay" */ "@/views/Replay.vue"),
  },
  {
    path: "/test",
    name: "Test",
    component: () => import(/* webpackChunkName: "test" */ "@/views/Test.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
