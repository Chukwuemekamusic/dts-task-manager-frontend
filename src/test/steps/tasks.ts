/// <reference types='codeceptjs' />
import { config as testConfig } from '../config';

const { I } = inject();

// The title is generated per run so repeat runs against a persistent database
// never collide, and is carried across steps so each assertion targets the same
// task through its whole lifecycle.
const state: { title: string } = { title: '' };

const url = (path: string): string => new URL(path, testConfig.TEST_URL).toString();

Given('I am on the task list', () => {
  I.amOnPage(url('/tasks'));
  I.waitForText('Your tasks');
});

When('I create a task', () => {
  state.title = `E2E task ${Date.now()}`;
  I.amOnPage(url('/tasks/new'));
  I.waitForText('Create a task');
  I.fillField('title', state.title);
  I.fillField('description', 'Created by the functional smoke test');
  I.checkOption('Pending');
  I.fillField('dueDate-day', '31');
  I.fillField('dueDate-month', '12');
  I.fillField('dueDate-year', '2026');
  I.fillField('dueTime', '09:00');
  I.click('Create task');
});

Then('I see the task with status {string}', (status: string) => {
  I.waitForText(state.title);
  I.see(state.title, 'h1');
  I.see(status);
});

When('I rename the task', () => {
  state.title = `${state.title} (amended)`;
  I.click('Edit task');
  I.waitForText('Edit task');
  I.fillField('title', state.title);
  I.click('Save changes');
});

When('I change the task status to {string}', (status: string) => {
  I.checkOption(status);
  I.click('Update status');
});

When('I delete the task', () => {
  I.click('Delete task');
  I.waitForText('Are you sure you want to delete this task?');
  I.click('Delete task');
});

Then('the task is no longer listed', () => {
  I.waitForText('Your tasks');
  I.dontSee(state.title);
});
