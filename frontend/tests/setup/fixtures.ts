import type { ListDetailData } from '@/features/todo-list';
import type { ListTemplate } from '@/features/list-templates';
import type { NavData } from '@/layouts/types';

// One consistent dataset for the per-layout smoke tests.
export const anna = {
  id: 'u-anna',
  email: 'anna@example.com',
  name: 'Anna Kovalenko',
  image: null,
};

export const nav: NavData = {
  user: {
    id: 'u-me',
    email: 'mykola@example.com',
    name: 'Mykola',
    googleCalendarConnected: false,
  },
  categories: [
    { id: 'c-work', name: 'Work', createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'c-home', name: 'Home', createdAt: '2026-09-01T00:00:00.000Z' },
  ],
  pendingInvites: [
    {
      id: 'inv-1',
      invitedAt: '2026-09-05T00:00:00.000Z',
      list: { id: 'l-q4', title: 'Q4 planning' },
    },
  ],
  templates: [{ id: 't-weekly', title: 'Weekly review', status: 'active' }],
  lists: [
    {
      id: 'l-launch',
      title: 'Launch todo v2',
      dueDate: '2099-09-12',
      updatedAt: '2026-09-06T10:00:00.000Z',
      templateId: null,
      isOwner: true,
      myCategory: { id: 'c-work', name: 'Work' },
      tasks: [
        { id: 'tk-1', title: 'Write release notes', done: true, dueDate: null },
        {
          id: 'tk-2',
          title: 'Fix drag-reorder',
          done: false,
          dueDate: '2099-09-09',
        },
      ],
      collaborators: [anna],
    },
    {
      id: 'l-groceries',
      title: 'Groceries',
      dueDate: '2000-01-01',
      updatedAt: '2026-09-06T09:00:00.000Z',
      templateId: 't-weekly',
      isOwner: true,
      myCategory: { id: 'c-home', name: 'Home' },
      tasks: [{ id: 'tk-3', title: 'Oat milk', done: false, dueDate: null }],
      collaborators: [],
    },
    {
      id: 'l-garage',
      title: 'Garage cleanup',
      dueDate: null,
      updatedAt: '2026-09-01T09:00:00.000Z',
      templateId: null,
      isOwner: false,
      myCategory: null,
      tasks: [],
      collaborators: [],
    },
  ],
};

export const listDetail: ListDetailData = {
  id: 'l-launch',
  title: 'Launch todo v2',
  dueDate: '2099-09-12',
  isOwner: true,
  templateId: null,
  myCategory: { id: 'c-work', name: 'Work' },
  collaborators: [anna],
  comments: [
    {
      id: 'cm-1',
      body: 'Safari date input looks off in dark mode.',
      createdAt: '2026-09-06T08:00:00.000Z',
      author: {
        id: 'u-anna',
        email: 'anna@example.com',
        name: 'Anna Kovalenko',
      },
    },
  ],
  tasks: [
    {
      id: 'tk-1',
      title: 'Write release notes',
      done: true,
      dueDate: null,
      comments: [],
    },
    {
      id: 'tk-2',
      title: 'Fix drag-reorder',
      done: false,
      dueDate: '2099-09-09',
      comments: [],
    },
  ],
};

export const template: ListTemplate = {
  id: 't-weekly',
  title: 'Weekly review',
  taskTitles: ['Clear inbox', 'Review OKRs'],
  recurrenceType: 'weekly',
  weekDays: [1],
  dayOfMonth: null,
  intervalDays: null,
  streakDays: null,
  streakStartDate: null,
  timezone: 'Europe/Madrid',
  status: 'active',
  collaborators: [],
};
