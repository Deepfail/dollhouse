# ✅ Prompt System - User Testing Checklist

## Before You Start

Make sure you've updated to the latest version with the prompt system fixes.

## Test 1: Verify Migration Worked

1. Open browser DevTools (F12)
2. Go to Console
3. Look for: `[promptMigration] ✅ Migration complete! Migrated X prompts`
4. ✅ **PASS** if you see this message (or if migration already ran)

## Test 2: Check Prompt Library Access

1. Open Settings (gear icon)
2. Click **Prompts** tab
3. ✅ **PASS** if you see a list of prompts organized by category (Character, Copilot, House)

## Test 3: Edit Copilot Personality

1. In Prompt Library, find **"Copilot Main Response Prompt"**
2. Change it to: `You are a friendly, casual buddy. Talk like a best friend. Be brief and fun.`
3. Click **Save**
4. Open Copilot chat
5. Say: "Hey, how's it going?"
6. ✅ **PASS** if copilot responds in a casual, friendly way

## Test 4: Verify No Duplicate Fields

1. Go to Settings → General tab
2. ✅ **PASS** if you see:
   - House Name field ✓
   - Blue info box about world description ✓
   - NO "World Prompt" textarea ✓

3. Go to Settings → Copilot tab
4. ✅ **PASS** if you see:
   - Max Tokens field ✓
   - Include House Context toggle ✓
   - Context Detail dropdown ✓
   - Blue info box about prompts ✓
   - NO "Copilot Prompt" textarea ✓

## Test 5: Check Wingman Settings

1. Open Wingman Settings (if you have access)
2. Go to "Current Prompts" tab
3. ✅ **PASS** if you see:
   - Blue info box directing to Prompt Library ✓
   - Current prompts shown (read-only) ✓
   - NO editable text fields ✓

## Test 6: Edit Character Creation Style

1. In Prompt Library, find **"Character Architect Core Prompt"**
2. At the top, add: `Make all characters extremely friendly and wholesome.`
3. Click **Save**
4. Create a new character (any method)
5. ✅ **PASS** if the character is noticeably friendly/wholesome

## Test 7: Edit Chat Response Style

1. In Prompt Library, find **"Chat Reply Template"**
2. Add at the end: `Always end responses with an emoji that matches your mood.`
3. Click **Save**
4. Chat with any character
5. ✅ **PASS** if character responses end with emoji

## Test 8: Reset a Prompt

1. Find the prompt you edited in Test 3
2. Click **Reset** button
3. ✅ **PASS** if prompt returns to default value

## Test 9: Check Migration Preserved Your Settings

IF you had custom prompts BEFORE the update:

1. In Prompt Library, check prompts for "Custom override" label
2. ✅ **PASS** if your old customizations are there

IF you're new to the app:

1. ✅ **PASS** - Skip this test

## Test 10: Verify Instant Updates

1. Edit any prompt in Prompt Library
2. Click **Save**
3. Immediately use the feature (chat, create character, etc.)
4. ✅ **PASS** if changes work WITHOUT reloading the page

## Troubleshooting

### Issue: Changes don't apply

**Fix:**

- Make sure you clicked **Save** in Prompt Library
- Check you edited the right prompt
- Try refreshing the page

### Issue: Can't find Prompt Library

**Fix:**

- Go to Settings (gear icon)
- Look for **Prompts** tab at the top
- Should be between "AI" and "Auto Creator" tabs

### Issue: Still see old prompt fields

**Fix:**

- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito/private mode

### Issue: Migration didn't run

**Fix:**

- Open DevTools Console
- Type: `localStorage.removeItem('prompts_migrated_v1')`
- Refresh page
- Check console for migration messages

## Success Criteria

✅ **ALL TESTS PASSED** - You're good to go! Prompts are working correctly.

⚠️ **SOME FAILED** - Check troubleshooting section above

❌ **MOST FAILED** - Report issue with:

1. Which tests failed
2. Browser console errors (F12 → Console)
3. Screenshots if possible

## What to Expect

### Working Correctly ✅

- Edit prompt → See changes immediately
- All prompts in ONE place (Prompt Library)
- No duplicate fields in settings
- Old customizations preserved

### Still Broken ❌

- Edit prompt → Nothing changes
- Multiple places to edit same prompt
- Settings still have prompt textareas
- Lost your old customizations

## Report Results

If everything works:

- 🎉 Enjoy your customized prompts!

If something's broken:

- Open an issue with test results
- Include browser console logs
- Mention which tests failed

---

**Need Help?**

- Read: `PROMPT_SYSTEM_FIXED.md` (user guide)
- Read: `PROMPT_LIBRARY_GUIDE.md` (detailed reference)
- Check browser console for errors
