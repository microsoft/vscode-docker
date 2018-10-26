git clean -xdf
npm i
npm run build
goto :exit

xcopy out out2\ /s
rd /s /q out
ren out2 out

xcopy node_modules node_modules2\ /s
rd /s /q node_modules
ren node_modules2 node_modules

:exit
