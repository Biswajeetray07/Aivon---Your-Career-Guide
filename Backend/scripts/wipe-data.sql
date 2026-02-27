-- Delete all Submissions, Arena Matches, and Users
-- Cascading will handle related records if any exist

DELETE FROM "submissions";
DELETE FROM "arena_matches";
DELETE FROM "users";

-- Leave problems, meta, and test_cases intact
