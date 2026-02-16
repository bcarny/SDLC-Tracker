# Screenshot Guidelines

This document provides guidelines for capturing screenshots of AppCompass for documentation purposes.

## Recommended Screenshots

### Main Views (Required)

1. **home-applications.png** - Applications list view showing the main dashboard
   - Capture with 2-3 sample applications visible
   - Show the "Add Application" form
   - Include maturity score badges if available

2. **application-detail.png** - Single application detail page
   - Show an application with linked teams
   - Display the maturity assessment section
   - Include assessment history if available

3. **assessment-form.png** - Maturity assessment form
   - Show the form with some criteria selected (levels 0-4)
   - Display multiple categories (Requirements & Planning, Design & Architecture, etc.)
   - Include the "Save assessment" button

4. **comparison-view.png** - Comparison view with charts
   - Show the radar chart with multiple applications
   - Display the comparison table with maturity scores
   - Include the export buttons

5. **teams-view.png** - Teams management page
   - Show teams list with linked applications visible
   - Display the "Add team" form
   - Show how linked applications appear under each team

6. **docs-view.png** - Documentation/API reference page
   - Show the "How to use AppCompass" section
   - Display the API reference with endpoints

### Workflow Screenshots (Optional)

- **add-application.png** - Adding a new application (form filled out)
- **link-team.png** - Linking a team to an application (dropdown open)
- **assessment-complete.png** - Completed assessment showing maturity score and level

## Capture Guidelines

### Browser & Resolution
- **Browser**: Chrome or Firefox (latest version)
- **Resolution**: 1920x1080 or 1440x900
- **Zoom**: 100% (no browser zoom)

### Content
- Use **sample data** that demonstrates key features
- Ensure data is **realistic** but not sensitive
- Show **complete workflows** where possible
- Include **error states** if documenting troubleshooting

### Format & Optimization
- **Format**: PNG (preferred) or JPEG
- **Optimization**: Use tools like `pngquant` or online optimizers to reduce file size
- **Naming**: Use kebab-case descriptive names (e.g., `home-applications.png`)
- **Size**: Aim for files under 500KB each for fast GitHub loading

### Privacy & Security
- **No sensitive data**: Remove or blur any real credentials, API keys, or personal information
- **Use sample data**: Create test applications, teams, and assessments
- **Check URLs**: Ensure no internal URLs or ports are visible if documenting production

### Accessibility
- **Alt text**: All images in README.md should have descriptive alt text
- **Contrast**: Ensure text is readable in screenshots
- **Focus states**: If showing interactions, ensure focus states are visible

## Taking Screenshots

### macOS
- Use `Cmd + Shift + 4` for area selection
- Use `Cmd + Shift + 3` for full screen
- Screenshots save to Desktop by default

### Windows
- Use `Win + Shift + S` for Snipping Tool
- Use `Win + PrtScn` for full screen
- Screenshots save to Screenshots folder

### Linux
- Use `Shift + PrtScn` for area selection
- Use `PrtScn` for full screen
- Many distributions include screenshot tools

## Workflow

1. Start the app locally: `npm run dev`
2. Navigate to http://localhost:3000
3. Create sample data (applications, teams, assessments)
4. Navigate to each view and capture screenshots
5. Save screenshots to `docs/images/` with recommended filenames
6. Optimize images if needed
7. Update README.md with image references

## Tips

- **Consistent styling**: Use the same browser and resolution for all screenshots
- **Clean state**: Clear browser cache and refresh before capturing
- **Multiple angles**: Consider capturing both desktop and mobile views if responsive
- **Annotate if needed**: Use image editing tools to add callouts or highlights
