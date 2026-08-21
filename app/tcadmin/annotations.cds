using TCService as service from '../../srv/hpbuysell-adm-tncmgmt-service';


// ============================================================
// ACTION LOG
// ============================================================
annotate service.ActionLog with @(

    UI.HeaderInfo                             : {
        TypeName      : 'T&C Action',
        TypeNamePlural: 'T&C Action Log',

        Title         : {
            $Type: 'UI.DataField',
            Value: userEmailId
        },

        Description   : {
            $Type: 'UI.DataField',
            Value: tcTypeSubType
        }
    },


    UI.SelectionFields                        : [
        userEmailId,
        tcType,
        tcSubTypeId,
        versionNumber,
        status
    ],


    UI.LineItem                               : [

        {
            $Type: 'UI.DataField',
            Value: userEmailId,
            Label: 'Email ID'
        },

        {
            $Type: 'UI.DataField',
            Value: firstName,
            Label: 'First Name'
        },

        {
            $Type: 'UI.DataField',
            Value: lastName,
            Label: 'Last Name'
        },

        {
            $Type: 'UI.DataField',
            Value: tcTypeSubType,
            Label: 'T&C Type / Sub Type'
        },

        {
            $Type: 'UI.DataField',
            Value: versionNumber,
            Label: 'Version'
        },

        {
            $Type: 'UI.DataField',
            Value: status,
            Label: 'Status'
        },

        {
            $Type: 'UI.DataField',
            Value: acceptedOn,
            Label: 'Accepted / Declined On'
        },

        {
            $Type: 'UI.DataField',
            Value: lastLoginDate,
            Label: 'Last Login Date'
        }

    ],


    // Object Page fields
    UI.FieldGroup #ActionGeneral              : {

    Data: [

        {
            $Type: 'UI.DataField',
            Label: 'Email ID',
            Value: userEmailId
        },

        {
            $Type: 'UI.DataField',
            Label: 'First Name',
            Value: firstName
        },

        {
            $Type: 'UI.DataField',
            Label: 'Last Name',
            Value: lastName
        },

        {
            $Type: 'UI.DataField',
            Label: 'User Profile',
            Value: userProfile
        },

        {
            $Type: 'UI.DataField',
            Label: 'T&C Type',
            Value: tcType
        },

        {
            $Type: 'UI.DataField',
            Label: 'T&C Sub Type',
            Value: tcSubTypeId
        },

        {
            $Type: 'UI.DataField',
            Label: 'Version',
            Value: versionNumber
        },

        {
            $Type: 'UI.DataField',
            Label: 'Status',
            Value: status
        },

        {
            $Type: 'UI.DataField',
            Label: 'Accepted / Declined On',
            Value: acceptedOn
        },

        {
            $Type: 'UI.DataField',
            Label: 'Last Login Date',
            Value: lastLoginDate
        }

    ]

    },


    UI.Facets                                 : [

    {
        $Type : 'UI.ReferenceFacet',
        ID    : 'ActionGeneralInformation',
        Label : 'General Information',
        Target: '@UI.FieldGroup#ActionGeneral'
    }

    ],


    UI.SelectionPresentationVariant #tableView: {

        $Type              : 'UI.SelectionPresentationVariantType',

        PresentationVariant: {

            $Type         : 'UI.PresentationVariantType',

            Visualizations: ['@UI.LineItem']

        },

        SelectionVariant   : {

            $Type        : 'UI.SelectionVariantType',

            SelectOptions: []

        },

        Text               : 'T&C Action Log'

    }

);


// ============================================================
// ACTION LOG -> VERSION VALUE HELP
// ============================================================

annotate service.ActionLog with {

    tcVersion @Common.ValueList: {

        $Type         : 'Common.ValueListType',

        CollectionPath: 'Versions',

        Parameters    : [

            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: tcVersion_ID,
                ValueListProperty: 'ID'
            },

            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'tcType'
            },

            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'tcSubTypeId'
            },

            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'versionNumber'
            },

            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'effectiveDate'
            }

        ]

    }

};


// ============================================================
// T&C VERSIONS
// ============================================================

annotate service.Versions with @(

    UI.HeaderInfo                                : {

        TypeName      : 'T&C Version',
        TypeNamePlural: 'T&C Versions',

        Title         : {
            $Type: 'UI.DataField',
            Value: tcTypeSubType
        },

        Description   : {
            $Type: 'UI.DataField',
            Value: versionNumber
        }

    },


    UI.SelectionFields                           : [
        tcType,
        tcSubTypeId,
        versionNumber,
        status
    ],


    // Default table metadata
    UI.LineItem                                  : [

        {
            $Type: 'UI.DataField',
            Value: tcTypeSubType,
            Label: 'T&C Type / Sub Type'
        },

        {
            $Type: 'UI.DataField',
            Value: versionNumber,
            Label: 'Version'
        },

        {
            $Type: 'UI.DataField',
            Value: status,
            Label: 'Status'
        },

        {
            $Type: 'UI.DataField',
            Value: effectiveDate,
            Label: 'Effective Date'
        },

        {
            $Type: 'UI.DataField',
            Value: uploadedBy,
            Label: 'Uploaded By'
        },

        {
            $Type: 'UI.DataField',
            Value: fileName,
            Label: 'File Name'
        }

    ],


    // Qualified table used by Versions tab
    UI.LineItem #versionsView                    : [

        {
            $Type: 'UI.DataField',
            Value: tcTypeSubType,
            Label: 'T&C Type / Sub Type'
        },

        {
            $Type: 'UI.DataField',
            Value: versionNumber,
            Label: 'Version'
        },

        {
            $Type: 'UI.DataField',
            Value: status,
            Label: 'Status'
        },

        {
            $Type: 'UI.DataField',
            Value: effectiveDate,
            Label: 'Effective Date'
        },

        {
            $Type: 'UI.DataField',
            Value: uploadedBy,
            Label: 'Uploaded By'
        },

        {
            $Type: 'UI.DataField',
            Value: fileName,
            Label: 'File Name'
        }

    ],


    UI.SelectionPresentationVariant #versionsView: {

        $Type              : 'UI.SelectionPresentationVariantType',

        PresentationVariant: {

            $Type         : 'UI.PresentationVariantType',

            Visualizations: ['@UI.LineItem#versionsView']

        },

        SelectionVariant   : {

            $Type        : 'UI.SelectionVariantType',

            SelectOptions: []

        },

        Text               : 'T&C Versions'

    },


    // --------------------------------------------------------
    // Versions Object Page - General Information
    // --------------------------------------------------------

    UI.FieldGroup #VersionGeneral                : {

    Data: [

        {
            $Type: 'UI.DataField',
            Label: 'T&C Type',
            Value: tcType
        },

        {
            $Type: 'UI.DataField',
            Label: 'T&C Sub Type',
            Value: tcSubTypeId
        },

        {
            $Type: 'UI.DataField',
            Label: 'Version',
            Value: versionNumber
        },

        {
            $Type: 'UI.DataField',
            Label: 'Status',
            Value: status
        },

        {
            $Type: 'UI.DataField',
            Label: 'Effective Date',
            Value: effectiveDate
        },

        {
            $Type: 'UI.DataField',
            Label: 'File Name',
            Value: fileName
        },

        {
            $Type: 'UI.DataField',
            Label: 'Document Path',
            Value: documentPath
        },

        {
            $Type: 'UI.DataField',
            Label: 'Uploaded By',
            Value: uploadedBy
        },

        {
            $Type: 'UI.DataField',
            Label: 'Uploaded At',
            Value: uploadedAt
        }

    ]

    },


    // --------------------------------------------------------
    // Versions Object Page
    // --------------------------------------------------------

    UI.Facets                                    : [

        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'VersionGeneralInformation',
            Label : 'General Information',
            Target: '@UI.FieldGroup#VersionGeneral'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'VersionChangeLog',
            Label : 'Change Log',
            Target: 'changes/@UI.LineItem#VersionChanges'
        }

    ]

);


// ============================================================
// CHANGE LOG
//
// No top-level List Report view.
// Used inside Versions Object Page through Versions.changes.
// ============================================================

annotate service.Changes with @(

UI.LineItem #VersionChanges: [

    {
        $Type: 'UI.DataField',
        Value: actionType,
        Label: 'Action'
    },

    {
        $Type: 'UI.DataField',
        Value: versionNumber,
        Label: 'Version'
    },

    {
        $Type: 'UI.DataField',
        Value: adminEmail,
        Label: 'Changed By'
    },

    {
        $Type: 'UI.DataField',
        Value: actionTimestamp,
        Label: 'Changed On'
    },

    {
        $Type: 'UI.DataField',
        Value: details,
        Label: 'Details'
    }

]

);
