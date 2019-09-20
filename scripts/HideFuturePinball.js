/*
  Metafilter will hide future pinball tables from
  all fitler views except systems and categories.
*/

let hideFuturePinballId;
function enableHideFuturePinball()
{
    // create the filter
    hideFuturePinballId = gameList.createMetaFilter({
        priority: 1000,
        select: function(game, include) {
			let curFilter = gameList.getCurFilter();
			if (curFilter.group == "[Sys]" ||
				curFilter.id.startsWith("Category."))
				return true;
			else
				return (game.system.systemClass != "FP");

        }
    });
}

enableHideFuturePinball();
