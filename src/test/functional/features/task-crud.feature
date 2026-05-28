Feature: Managing tasks
  A caseworker can create a task and then view, rename, re-status and delete it
  through the GOV.UK interface — the full lifecycle against the real backend.

  Scenario: The full task lifecycle
    Given I am on the task list
    When I create a task
    Then I see the task with status "Pending"

    When I rename the task
    Then I see the task with status "Pending"

    When I change the task status to "Completed"
    Then I see the task with status "Completed"

    When I delete the task
    Then the task is no longer listed
