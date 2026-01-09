# Agent Instructions

Welcome to our project! This document contains instructions for AI agents working with our codebase.

## Introduction

This document is designed to help AI agents understand how to work with our codebase effectively. We have many guidelines and best practices that have been developed over time.

## Project History

Our project started in 2020 as a small experiment. Over the years, it has grown into a full-fledged application with many features and capabilities. We've learned a lot along the way and have incorporated those learnings into this document.

### Early Days

In the beginning, we had only a handful of developers. The codebase was simple and straightforward. Everyone knew what everyone else was doing.

### Growth Phase

As the project grew, we added more developers and more features. This is when we realized we needed better documentation and guidelines.

### Current State

Today, we have a mature codebase with clear patterns and practices. This document reflects our current understanding of best practices.

## Development Environment

You'll need to set up your development environment before you can start working on the project. Here are the steps:

1. Install Node.js (version 16 or higher)
2. Install Git
3. Clone the repository
4. Run `npm install`
5. Set up your IDE

### IDE Configuration

We recommend using VS Code. Here are some recommended extensions:
- ESLint
- Prettier
- GitLens
- TODO Highlight
- Bracket Pair Colorizer

## Coding Style

Our coding style is based on industry best practices. We use ESLint and Prettier to enforce consistent code formatting.

### Naming Conventions

Use camelCase for variables and functions. Use PascalCase for classes and components. Use UPPER_SNAKE_CASE for constants.

### File Organization

Organize your files logically. Group related files together. Keep your directory structure clean and intuitive.

### Comments

Write clear comments. Comments should explain why, not what. Good code is self-documenting, but sometimes you need to explain the reasoning behind a decision.

## Testing

Testing is important. You should write tests for your code. We use Jest for unit tests and Cypress for end-to-end tests.

### Unit Tests

Unit tests test individual functions and components in isolation. They should be fast and focused.

### Integration Tests

Integration tests verify that different parts of the system work together correctly.

### End-to-End Tests

End-to-end tests simulate real user interactions and verify the entire application flow.

## Git Workflow

We use Git for version control. Here's our branching strategy:

### Branches

- `main`: The main branch, always stable
- `develop`: The development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Emergency fixes

### Commits

Write good commit messages. A commit message should explain what changed and why.

## Code Review

All code must be reviewed before merging. Code review is an opportunity to catch bugs, share knowledge, and improve code quality.

### Review Process

1. Create a pull request
2. Wait for CI to pass
3. Request reviews from team members
4. Address feedback
5. Merge when approved

## Documentation

Documentation is important. Keep documentation up to date. Write clear and concise documentation.

### README

The README should provide an overview of the project and explain how to get started.

### Code Comments

Use comments to explain complex logic or non-obvious decisions.

### API Documentation

Document your APIs clearly. Include examples and explain parameters.

## Performance

Performance matters. Write efficient code. Profile your application to identify bottlenecks.

### Optimization Tips

- Minimize DOM manipulations
- Use memoization where appropriate
- Lazy load resources
- Optimize images
- Minimize bundle size

## Security

Security is crucial. Always validate user input. Never trust data from external sources.

### Best Practices

- Use parameterized queries to prevent SQL injection
- Sanitize user input
- Use HTTPS
- Keep dependencies up to date
- Follow OWASP guidelines

## Deployment

We deploy to production using CI/CD. The deployment process is automated.

### Staging Environment

Test in staging before deploying to production. Staging should mirror production as closely as possible.

### Production Deployment

Production deployments happen automatically when code is merged to main. Monitor the deployment and be ready to rollback if issues arise.

## Monitoring

Monitor your application in production. Use logging and error tracking tools.

### Logging

Log important events. Use appropriate log levels (debug, info, warn, error).

### Error Tracking

Use error tracking tools to catch and diagnose issues in production.

## Troubleshooting

When things go wrong, stay calm and debug systematically.

### Common Issues

- Build failures: Check your dependencies
- Test failures: Read the error messages carefully
- Deployment issues: Check the CI/CD logs

## Additional Guidelines

Here are some additional guidelines that didn't fit into the above sections.

### Communication

Communicate clearly with your team. Ask questions when you're unsure. Share your knowledge with others.

### Collaboration

Work well with others. Be respectful and professional. Help your teammates when they need it.

### Continuous Learning

Keep learning and improving. Technology changes quickly. Stay up to date with new tools and techniques.

## Testing Guidelines (Detailed)

Testing is really important. You should always write tests for your code. This cannot be emphasized enough. Tests help catch bugs early and make refactoring safer.

### Test Coverage

Aim for high test coverage. We target 80% or higher. But remember, coverage is not everything - quality matters more than quantity.

### Test Organization

Organize your tests logically. Keep test files close to the code they test. Use descriptive test names.

## Important Security Rules

IMPORTANT: Never commit secrets or API keys to the repository. Always use environment variables for sensitive data. This is absolutely critical.

IMPORTANT: Always validate and sanitize user input. Never trust data coming from users or external sources.

IMPORTANT: Keep all dependencies up to date. Regularly check for security vulnerabilities using npm audit.

## Critical Git Rules

NEVER force push to main or develop branches. This can cause serious issues for the team.

NEVER commit directly to main. Always use pull requests.

ALWAYS run tests before committing. Make sure all tests pass.

ALWAYS write meaningful commit messages. Use the conventional commit format.

## Final Notes

Thank you for reading this document. If you have questions, ask the team. We're here to help.

Remember: quality is more important than speed. Take your time and do things right.

Good luck!
