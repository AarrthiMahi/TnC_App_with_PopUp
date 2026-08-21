using {cuid} from '@sap/cds/common';

namespace hpbuysell.adm.tncmgmt;

// T&C Types
type TCType        : String(20) enum {
    PURCHASING;
    SALES;
};

// T&C Sub Types
type TCSubTypeId   : String(10) enum {
    CPT;
    MTOU;
    POTAC;
};

// Version Status
type VersionStatus : String(20) enum {
    ACTIVE;
    ARCHIVED;
};

// User Action
type ActionStatus  : String(20) enum {
    ACCEPTED;
    DECLINED;
};


// Stores every version of a Terms & Conditions document.
entity TCVersionMaster : cuid {

    tcType        : TCType not null;
    tcSubTypeId   : TCSubTypeId not null;
    versionNumber : String(20) not null;
    effectiveDate : Timestamp not null;
    documentPath  : String(500) not null;
    fileName      : String(255) not null;
    status        : VersionStatus default 'ACTIVE' not null;
    uploadedBy    : String(100) not null;
    uploadedAt    : Timestamp not null;
}

// Stores Accept / Decline actions performed by users.
entity TCActionLog : cuid {

    userEmailId   : String(100) not null;
    firstName     : String(60);
    lastName      : String(60);
    userProfile   : String(20) enum {
        CUSTOMER;
        SUPPLIER;
        HP_USER;
    } not null;
    tcType        : TCType not null;
    tcSubTypeId   : TCSubTypeId not null;
    tcVersion     : Association to TCVersionMaster not null;
    status        : ActionStatus not null;
    acceptedOn    : Timestamp not null;
    lastLoginDate : Timestamp not null;
}


// Audit log for Admin changes to T&C versions.
entity ChangeLog : cuid {

    adminUserId     : String(100) not null;
    adminEmail      : String(100) not null;
    actionType      : String(30) enum {
        UPLOAD_TC;
        ARCHIVE_TC;
    } not null;
    tcType          : TCType not null;
    tcSubTypeId     : TCSubTypeId not null;
    versionNumber   : String(20) not null;
    actionTimestamp : Timestamp not null;
    details         : String(500);
}
