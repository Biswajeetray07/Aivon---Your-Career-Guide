with open("app/(app)/dashboard/page.tsx", "r") as f:
    lines = f.readlines()

# delete lines 158 to 163 (indices 157 to 162)
del lines[157:163]

with open("app/(app)/dashboard/page.tsx", "w") as f:
    f.writelines(lines)
