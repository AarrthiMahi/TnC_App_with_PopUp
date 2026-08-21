using hpbuysell.adm.tncmgmt as tc from '../db/hpbuysell-adm-tncmgmt-model';

service TCService @(path: '/tc') {

    // Action Log
    @readonly
    @(requires: 'TC_Viewer')
    entity ActionLog as
        projection on tc.TCActionLog {
            *,
            tcVersion.versionNumber        as versionNumber : String(20),
            tcType || ' · ' || tcSubTypeId as tcTypeSubType : String(100)
        };

    // T&C Versions Change Log
    @readonly
    @(requires: 'TC_Viewer')
    entity Changes   as projection on tc.ChangeLog;

    // T&C Version Master
    @readonly
    @(requires: 'TC_Viewer')
    entity Versions  as
        projection on tc.TCVersionMaster {

            *,

            tcType || ' · ' || tcSubTypeId as tcTypeSubType : String(100),

            changes                                         : Association to many Changes
                                                                  on  changes.tcType        = $self.tcType
                                                                  and changes.tcSubTypeId   = $self.tcSubTypeId
                                                                  and changes.versionNumber = $self.versionNumber
        };

    // Popup - Applicable T&C
    @(requires: 'authenticated-user')
    function getApplicableTC()                         returns array of {
        tcType   : String;
        subTypes : array of {
            tcSubTypeId   : String;
            tcVersionId   : UUID;
            versionNumber : String;
            documentPath  : String;
            fileName      : String;
        };
    };

    //PopUp - Accept/Decline
    @(requires: 'authenticated-user')
    action   submitTCAction(tcType: String,
                            decision: String,
                            subTypes: array of {
        tcSubTypeId    : String;
        tcVersionId    : UUID;
    })                                                 returns {
        queueRemaining : Boolean;
    };

    //Admin - Upload New T&C Version
    @(requires: 'TC_Admin')
    action   uploadTCVersion(tcType: String,
                             tcSubTypeId: String,
                             fileName: String,
                             fileContent: LargeBinary) returns {
        tcVersionId   : UUID;
        versionNumber : String;
    };

    //Login Session
    @(requires: 'authenticated-user')
    function getLoginSession()                         returns {
        sessionKey : String;
    };
}
