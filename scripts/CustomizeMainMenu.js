

//System Filter Commands
let systemFilterVP = command.allocate("sysFilter_Visual Pinball X");
let systemFilterFX2 = command.allocate("sysFilter_Pinball FX2");
let systemFilterPP = command.allocate("sysFilter_Pro Pinball");
let systemFilterFP = command.allocate("sysFilter_Future Pinball");
//Category Filter Commands
let categoryFilterFX2SW = command.allocate("catFilter_Pinball FX2 - Starwars");
//Menu Commands
let filtersSubmenu = command.allocate("FilterSubmenu")


function addMenuCategory(ev, where, title, myCmd)
{
	if (gameList.getCurFilter().id  == "Category." + command.name(myCmd).substring(10)) {
	  title = "\u2022 " + title;	
	}
	
	ev.addMenuItem( where, { title: title, cmd: myCmd })	
}

function addMenuEntrySystem(ev, where, title, myCmd)
{
	
	if (gameList.getCurFilter().id  == "System." + command.name(myCmd).substring(10)) {
	  title = "\u2022 " + title;	
	}
	
	ev.addMenuItem( where, { title: title, cmd: myCmd })	
}

mainWindow.on("menuopen", ev => {

	let AllFiltersId=40000
	
    if (ev.id == "main") {
		
		
		//alert("Id:" + gameList.getCurFilter().id + " cmd: " + gameList.getCurFilter().cmd);
		
		// Remove unwanted entries
		ev.deleteMenuItem(-1);
        ev.deleteMenuItem(command.FilterByEra);
		ev.deleteMenuItem(command.FilterByAdded);
		ev.deleteMenuItem(command.FilterByCategory);
		ev.deleteMenuItem(command.FilterByManufacturer);
		ev.deleteMenuItem(command.FilterByRating);
		ev.deleteMenuItem(command.FilterByRecency);
		ev.deleteMenuItem(command.FilterBySystem);
		ev.deleteMenuItem(command.AddFavorite);
		ev.deleteMenuItem(command.HighScores);
		ev.deleteMenuItem("Favorites");

		// Add custom system & category entries.
		addMenuEntrySystem( ev, {after: "All Tables"}, "Visual Pinball Tables", systemFilterVP );
		addMenuEntrySystem( ev, {after: systemFilterVP}, "Pinball FX2 Tables", systemFilterFX2 );
		addMenuEntrySystem( ev, {after: systemFilterFX2}, "Pro Pinball Tables", systemFilterPP );
		addMenuEntrySystem( ev, {after: systemFilterPP}, "Future Pinball Tables (3D)", systemFilterFP );
	
		ev.deleteMenuItem("All Tables");
	
		if (gameList.getCurFilter().id  == "All")
    		ev.addMenuItem( {before: systemFilterVP }, { title: "\u2022 " + "All Tables", cmd: AllFiltersId });
		else 
			ev.addMenuItem( {before: systemFilterVP }, { title: "All Tables", cmd: AllFiltersId });
	
		//ev.addMenuItem( {before: "Play"}, { title: "Categories", cmd: 32824 });
	
		ev.addMenuItem( {after: systemFilterFP }, { title: "Other Filters \u25B6", cmd: filtersSubmenu } );	
		ev.addMenuItem( {after: systemFilterFP }, { title: "Categories \u25B6", cmd: command.FilterByCategory } );	


		// Add spacer bars
		ev.addMenuItem( { after: "Play" }, [{cmd: -1}]);	
		ev.addMenuItem( { before: AllFiltersId }, [{cmd: -1}]);	
		ev.addMenuItem( { after: systemFilterFP }, [{cmd: -1}]);	
		ev.addMenuItem( { before: "Return" }, [{cmd: -1}]);	


		//ev.tidyMenu();

    }
});


mainWindow.on("command", ev => {
	
	//alert(ev.id);
	let commandName = command.name(ev.id);
    //alert(gameList.getCurFilter().id)
	if (commandName.includes("catFilter_")) {
        gameList.setCurFilter("Category." + commandName.substring(10));
    }
	else if (commandName.includes("sysFilter_")) {
        gameList.setCurFilter("System." + commandName.substring(10));
    }
	if (ev.id == command.FilterSubmenu) {
            mainWindow.showMenu("custom.filters", [
                //{ title: "Filter By Category  \u25B6", cmd: command.FilterByCategory },
                { title: "Filter By Era  \u25B6", cmd: command.FilterByEra },
                { title: "Filter By Manufacturer  \u25B6", cmd: command.FilterByManufacturer },
                //{ title: "Filter By System  \u25B6", cmd: command.FilterBySystem },
                { title: "Filter By Rating  \u25B6", cmd: command.FilterByRating },
                { title: "Filter By Last Played  \u25B6", cmd: command.FilterByRecency },
                { title: "Filter By Date Added  \u25B6", cmd: command.FilterByAdded },
                { cmd: -1 },  // separator
                { title: "Return", cmd: command.MenuReturn }
            ]);

            // tell the system not to launch the game yet
            // ev.preventDefault();
    }



});