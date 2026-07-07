## Stardance mcp
No api? want cool mcp? here is stardance mcp:


### Features
- [x] Admin Jobs
- [ ] admin flipper
- [x] admin blazer
- [ ] admin user lookup 
- [ ] admin project look up 
- [ ] shop order creation
- [x] feed
- [ ] user search (cmd+k search)
- [ ] project search (cmd+k search)


## How to use

1. Download the executable (linux only atm)
2. Grab you stardance session (Your `` cookie)
3. add it to claude!!`claude mcp add stardance -- -e STARDANCE_SESSION=<ur session here> <executable path here>` (for quick testing run ` echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | STARDANCE_SESSION=fake timeout 3 ./dist/stardance-mcp`)
4. congrats you can stardance it in the claude chat.