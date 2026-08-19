using hpbuysell.adm.tncmgmt as tc from '../db/hpbuysell-adm-tncmgmt-model';

service TCService @(path: '/tc') {

    // T&C acceptance / decline records
    @readonly
    @(requires: 'TC_Viewer')
    entity ActionLog as
        projection on tc.TCActionLog {
            *,
            tcVersion.versionNumber      as versionNumber : String(20),
            tcType || ' · ' || tcSubType as tcTypeSubType : String(100)
        };

    // T&C versions maintained by Admin
    @readonly
    @(requires: 'TC_Viewer')
    entity Versions  as
        projection on tc.TCVersionMaster {
            *,
            tcType || ' · ' || tcSubType as tcTypeSubType : String(100)
        };

    // Admin change history
    @readonly
    @(requires: 'TC_Viewer')
    entity Changes   as projection on tc.ChangeLog;

    // Called by the login-time T&C popup.
    @(requires: 'authenticated-user')
    function getApplicableTC()                         returns array of {
        tcType   : String;
        subTypes : array of {
            tcSubType     : String;
            tcVersionId   : UUID;
            versionNumber : String;
            documentPath  : String;
            fileName      : String;
        };
    };

    @(requires: 'authenticated-user')
    action   submitTCAction(tcType: String,
                            decision: String,

                            subTypes: array of {
        tcSubType      : String;
        tcVersionId    : UUID;
    })                                                 returns {
        queueRemaining : Boolean;
    };

    @(requires: 'TC_Admin')
    action   uploadTCVersion(tcType: String,
                             tcSubType: String,
                             fileName: String,
                             fileContent: LargeBinary) returns {
        tcVersionId   : UUID;
        versionNumber : String;
    };

    @(requires: 'authenticated-user')
    function getLoginSession()                         returns {
        sessionKey : String;
    };
}
