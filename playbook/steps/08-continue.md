# Step 7: coming back later

1. `npm run cm -- status <project>` and summarize: counts per status per platform, the next scheduled slots, and how many items are still `queued`.
2. Verify first (step 6): mark items that are now live as `posted`.
3. Continue uploading the `queued` items in id order, as far as each platform's scheduler allows.
4. To add another video to the project, go to step 1 and **append**; to start something new, create a new project.
5. If the user doesn't already have `index.html` open, run `npm run cm -- open <project>`. Say when to come back next; the dashboard's "Post now" list shows anything that comes due in the meantime.
