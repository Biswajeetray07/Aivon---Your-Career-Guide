import re

with open("app/(app)/dashboard/page.tsx", "r") as f:
    content = f.read()

# I want to remove the specific duplicate block
target = """                      <div className="flex gap-6 pt-2 items-center">
                        <span className="text-[#00E5B0] font-bold text-lg">❯</span>
                        <span className="text-white opacity-80 min-w-[80px]">status:</span>
                        <span className="text-[#FACC15] animate-pulse">OPTIMIZED</span>
                      </div>
                    </div>
                  </div>
                    <div className="flex gap-6 border-t border-white/5 pt-5 mt-5 items-center">
                      <span className="text-[#00E5B0] font-bold text-lg">❯</span>
                      <span className="text-white opacity-80 min-w-[80px]">status:</span>
                      <span className="text-[#FACC15] animate-pulse">OPTIMIZED</span>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </motion.header>"""

replacement = """                      <div className="flex gap-6 border-t border-white/5 pt-5 mt-5 items-center">
                        <span className="text-[#00E5B0] font-bold text-lg">❯</span>
                        <span className="text-white opacity-80 min-w-[80px]">status:</span>
                        <span className="text-[#FACC15] animate-pulse">OPTIMIZED</span>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </motion.header>"""

new_content = content.replace(target, replacement)
with open("app/(app)/dashboard/page.tsx", "w") as f:
    f.write(new_content)

print(target in content)
print(target in new_content)
