'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Checkbox } from '@ui/components/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/select';
import type { RecurrenceType } from './types';
import type { TemplateFormInput } from './actions';
import { weekdayLabels } from './recurrence-summary';

interface TemplateFormProps {
  initialValues?: TemplateFormInput;
  onSubmit: (input: TemplateFormInput) => Promise<void>;
  submitLabel: string;
}

export function TemplateForm({
  initialValues,
  onSubmit,
  submitLabel,
}: TemplateFormProps) {
  const t = useTranslations('ListTemplates');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [taskTitles, setTaskTitles] = useState<string[]>(
    initialValues?.taskTitles && initialValues.taskTitles.length > 0
      ? initialValues.taskTitles
      : [''],
  );
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialValues?.recurrenceType ?? 'daily',
  );
  const [weekDays, setWeekDays] = useState<number[]>(
    initialValues?.weekDays ?? [],
  );
  const [dayOfMonth, setDayOfMonth] = useState(initialValues?.dayOfMonth ?? 1);
  const [intervalDays, setIntervalDays] = useState(
    initialValues?.intervalDays ?? 1,
  );
  const [timezone, setTimezone] = useState(
    initialValues?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  function updateTaskTitle(index: number, value: string) {
    setTaskTitles((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeTaskTitle(index: number) {
    setTaskTitles((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleWeekDay(day: number) {
    setWeekDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTaskTitles = taskTitles
      .map((title) => title.trim())
      .filter(Boolean);

    startTransition(async () => {
      await onSubmit({
        title,
        taskTitles: trimmedTaskTitles,
        recurrenceType,
        weekDays: recurrenceType === 'weekly' ? weekDays : undefined,
        dayOfMonth: recurrenceType === 'monthly' ? dayOfMonth : undefined,
        intervalDays:
          recurrenceType === 'everyNDays' ? intervalDays : undefined,
        timezone,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="template-title">{t('titleLabel')}</Label>
        <Input
          id="template-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('taskTitlesLabel')}</Label>
        <div className="flex flex-col gap-2">
          {taskTitles.map((taskTitle, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={taskTitle}
                onChange={(event) => updateTaskTitle(index, event.target.value)}
                placeholder={t('taskTitlePlaceholder')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={taskTitles.length === 1}
                onClick={() => removeTaskTitle(index)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t('removeTaskButton')}</span>
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setTaskTitles((prev) => [...prev, ''])}
        >
          {t('addTaskButton')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="template-recurrence-type">
          {t('recurrenceTypeLabel')}
        </Label>
        <Select
          value={recurrenceType}
          onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}
        >
          <SelectTrigger id="template-recurrence-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t('recurrenceDaily')}</SelectItem>
            <SelectItem value="weekly">{t('recurrenceWeekly')}</SelectItem>
            <SelectItem value="monthly">{t('recurrenceMonthly')}</SelectItem>
            <SelectItem value="everyNDays">
              {t('recurrenceEveryNDays')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recurrenceType === 'weekly' ? (
        <div className="flex flex-col gap-2">
          <Label>{t('weekDaysLabel')}</Label>
          <div className="flex flex-wrap gap-4">
            {weekdayLabels(locale).map((label, day) => (
              <label
                key={day}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={weekDays.includes(day)}
                  onCheckedChange={() => toggleWeekDay(day)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {recurrenceType === 'monthly' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-day-of-month">{t('dayOfMonthLabel')}</Label>
          <Select
            value={String(dayOfMonth)}
            onValueChange={(value) => setDayOfMonth(Number(value))}
          >
            <SelectTrigger id="template-day-of-month" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {recurrenceType === 'everyNDays' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-interval-days">
            {t('intervalDaysLabel')}
          </Label>
          <Input
            id="template-interval-days"
            type="number"
            min={1}
            value={intervalDays}
            onChange={(event) => setIntervalDays(Number(event.target.value))}
            className="w-24"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="template-timezone">{t('timezoneLabel')}</Label>
        <Input
          id="template-timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
