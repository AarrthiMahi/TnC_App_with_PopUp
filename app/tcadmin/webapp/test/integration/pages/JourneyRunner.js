sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/hp/buysell/tcadmin/tcadmin/test/integration/pages/ActionLogList.gen",
	"com/hp/buysell/tcadmin/tcadmin/test/integration/pages/ActionLogObjectPage.gen"
], function (JourneyRunner, ActionLogListGenerated, ActionLogObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/hp/buysell/tcadmin/tcadmin') + '/test/flp.html#app-preview',
        pages: {
			onTheActionLogListGenerated: ActionLogListGenerated,
			onTheActionLogObjectPageGenerated: ActionLogObjectPageGenerated
        },
        async: true
    });

    return runner;
});

