import type { HintSet, DetectorResult } from "./types";

export function buildHints(cause: DetectorResult): HintSet {
  
  const hints: HintSet = {
     level1: "Your output does not match expected. Review your logic.",
     level2: "Check the exact differences carefully to see where it breaks.",
     level3: "Make sure you trace your loop variables step by step."
  };

  switch (cause.cause) {
      case "FORMAT_MISMATCH":
        hints.level1 = "Your algorithm is likely perfectly correct, but you failed the test due to spacing or formatting.";
        hints.level2 = "Check your print statements. Did you accidentally leave a trailing space at the end of a line?";
        hints.level3 = "Make sure you only print elements separated by a single space, and do not append a space after the final element if not expected.";
        break;
      case "CASE_MISMATCH":
        hints.level1 = "Your answer is correct, but your capitalization is wrong.";
        hints.level2 = "Check if the problem asks for 'True' vs 'true', or 'YES' vs 'yes'.";
        hints.level3 = "String matching is strictly case-sensitive. Return exactly what the problem description specifies.";
        break;
      case "ORDERING_MISMATCH":
        hints.level1 = "You've successfully found all the correct elements, but they are in the wrong order.";
        hints.level2 = "If the problem requires a specific order, make sure you sort your result or traverse your data structure correctly.";
        hints.level3 = "If your array is exactly backwards, verify if you should be inserting at the beginning vs the end of your list, or reversing before returning.";
        break;
      case "OFF_BY_ONE":
        hints.level1 = "Your sequence diverges exactly at the boundary. Very close!";
        hints.level2 = "This strongly indicates an off-by-one error. Check your loop condition (`<` vs `<=`).";
        hints.level3 = "Are you accidentally overshooting your array bounds, or failing to process the very last element in your loop?";
        break;
      case "FLOAT_PRECISION":
        hints.level1 = "Your answer is extremely close. You may be losing precision in your math.";
        hints.level2 = "Are you doing integer division (e.g., `5 / 2 = 2`) instead of float division (`5.0 / 2.0 = 2.5`) somewhere in your calculation?";
        hints.level3 = "Ensure all floating-point variables use `double` precision. Avoid premature rounding or casting to integers before the final calculation.";
        break;
      case "INTEGER_OVERFLOW":
        hints.level1 = "Your answer is negative when a massive positive number is expected. This happens when data sizes exceed limits.";
        hints.level2 = "A standard 32-bit integer can only hold up to roughly 2.14 billion. Adding beyond this wraps around to negatives.";
        hints.level3 = "Change your sum or product variables to 64-bit integers (`long long` in C++, `long` in Java/C#, or handle safely in your language).";
        break;
      case "EDGE_CASE_MISS":
        hints.level1 = "You handled the standard logic well, but tripped on a fundamental edge case.";
        hints.level2 = "What happens in your code if the input size `n` is 0, or if an array is completely empty?";
        hints.level3 = "Add an explicit `if (n == 0) return ...;` block at the very top of your function to catch these boundaries safely.";
        break;
      case "PARTIAL_LOGIC_ERROR":
        hints.level1 = "Your logic worked for the first part of the sequence, but then abruptly failed or stopped.";
        hints.level2 = "Check your early loop exits. Did you trigger a `break` or `return` too soon?";
        hints.level3 = "Verify that your inner loops aren't accidentally bypassing the rest of the array handling due to a faulty condition.";
        break;
  }

  return hints;
}
