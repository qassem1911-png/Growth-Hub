import re

def refine_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update task title styling for smooth transition
    target1 = 'text-base md:text-[17px] font-space font-bold tracking-tight text-[#FFFFFF] transition-all uppercase truncate max-w-full block'
    target2 = 'task.is_completed && "text-[var(--text-secondary)] opacity-50 line-through"'
    
    if target1 in content and target2 in content:
        content = content.replace(target1, 'text-base md:text-[17px] font-space font-bold tracking-tight transition-all duration-300 ease-in-out uppercase truncate max-w-full block')
        content = content.replace(target2, 'task.is_completed ? "text-gray-500 line-through opacity-55" : "text-white"')
        print(f"Applied style transition to {path}")
    else:
        print(f"Style targets NOT found in {path}")

    # 2. Add Inline Quick-Add Row
    # Find </AnimatePresence> that terminates the list view.
    # In list view, it's followed by </div>.
    # Let's inspect the target segment:
    #                 </AnimatePresence>
    #              </div>
    #            ) : (
    #              <KanbanBoard
    
    list_end_target = """                </AnimatePresence>
             </div>
           ) : (
             <KanbanBoard"""
             
    if list_end_target in content:
        # We want to insert the Inline Quick-Add row right before the </div> that closes the list view
        inline_add_code = """                </AnimatePresence>

                 {/* INLINE QUICK ADD ROW */}
                 <div className="mt-3 flex items-center gap-3 p-3 bg-white/[0.01] hover:bg-white/[0.02] border border-dashed border-white/10 hover:border-white/20 rounded-xl transition-all">
                   <div className="w-5 shrink-0 text-right select-none font-mono text-[10px] text-white/20 font-black">
                     +
                   </div>
                   <input
                     type="text"
                     placeholder={isRTL ? "إضافة مهمة سريعة... (Enter)" : "Quick add task... (Press Enter)"}
                     className="flex-1 bg-transparent border-none outline-none font-space text-sm text-white placeholder-white/30"
                     onKeyDown={async (e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault()
                         const title = e.currentTarget.value.trim()
                         if (!title) return
                         e.currentTarget.value = ''
                         
                         // Create task optimistically
                         const newId = 'temp_' + Date.now()
                         const tempTask = {
                           id: newId,
                           title,
                           is_completed: false,
                           weight: 3,
                           cup_id: id,
                           metadata: {}
                         }
                         
                         setMission((prev: any) => ({
                           ...prev,
                           tasks: [...(prev.tasks || []), tempTask]
                         }))
                         
                         playBlip()
                         
                         const isLocal = typeof id === 'string' && id.startsWith('local_')
                         if (isLocal) {
                           setMission((prev: any) => {
                             const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]');
                             const updatedTasks = prev.tasks.map((t: any) => t.id === newId ? { ...t, id: 'local_task_' + Date.now() } : t);
                             const next = { ...prev, tasks: updatedTasks };
                             const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g);
                             localStorage.setItem('guest_goals', JSON.stringify(updatedGoals));
                             return next;
                           });
                           return;
                         }
                         
                         const { data, error } = await supabase
                           .from('tasks')
                           .insert([{
                             cup_id: id,
                             title,
                             weight: 3,
                             is_completed: false
                           }])
                           .select()
                           
                         if (error) {
                           setMission((prev: any) => ({
                             ...prev,
                             tasks: (prev.tasks || []).filter((t: any) => t.id !== newId)
                           }))
                           showToast(isRTL ? "فشل إنشاء المهمة" : "FAILED TO CREATE TASK", "warning")
                           playError()
                         } else if (data && data[0]) {
                           setMission((prev: any) => ({
                             ...prev,
                             tasks: (prev.tasks || []).map((t: any) => t.id === newId ? data[0] : t)
                           }))
                         }
                       }
                     }}
                   />
                 </div>
             </div>
           ) : (
             <KanbanBoard"""
             
        content = content.replace(list_end_target, inline_add_code)
        print(f"Applied Inline Quick-Add to {path}")
    else:
        print(f"Inline Quick-Add targets NOT found in {path}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

refine_file('src/app/missions/[id]/page.tsx')
refine_file('src/app/goals/squad/[id]/page.tsx')
