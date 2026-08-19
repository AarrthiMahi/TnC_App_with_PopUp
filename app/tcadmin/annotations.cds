using TCService as service
    from '../../srv/hpbuysell-adm-tncmgmt-service';

annotate service.ActionLog with @(
    UI.FieldGroup #GeneratedGroup             : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'userEmailId',
                Value: userEmailId,
            },
            {
                $Type: 'UI.DataField',
                Label: 'firstName',
                Value: firstName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'lastName',
                Value: lastName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'userProfile',
                Value: userProfile,
            },
            {
                $Type: 'UI.DataField',
                Label: 'tcType',
                Value: tcType,
            },
            {
                $Type: 'UI.DataField',
                Label: 'tcSubType',
                Value: tcSubType,
            },
            {
                $Type: 'UI.DataField',
                Label: 'status',
                Value: status,
            },
            {
                $Type: 'UI.DataField',
                Label: 'acceptedOn',
                Value: acceptedOn,
            },
            {
                $Type: 'UI.DataField',
                Label: 'lastLoginDate',
                Value: lastLoginDate,
            },
            {
                $Type: 'UI.DataField',
                Label: 'versionNumber',
                Value: versionNumber,
            },
            {
                $Type: 'UI.DataField',
                Label: 'tcTypeSubType',
                Value: tcTypeSubType,
            },
        ],
    },
    UI.Facets                                 : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.SelectionPresentationVariant #tableView: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem',
            ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
        Text               : 'T&C Action Log',
    },
);

annotate service.ActionLog with {
    tcVersion @Common.ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Versions',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: tcVersion_ID,
                ValueListProperty: 'ID',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'tcType',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'tcSubType',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'versionNumber',
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'effectiveDate',
            },
        ],
    }
};

annotate service.ActionLog with @(
    UI.HeaderInfo     : {
        TypeName      : 'T&C Action',
        TypeNamePlural: 'T&C Action Log'
    },

    UI.SelectionFields: [
        userEmailId,
        tcType,
        tcSubType,
        versionNumber,
        status
    ],

    UI.LineItem       : [
        {
            Value: userEmailId,
            Label: 'Email ID'
        },
        {
            Value: firstName,
            Label: 'First Name'
        },
        {
            Value: lastName,
            Label: 'Last Name'
        },
        {
            Value: tcTypeSubType,
            Label: 'T&C Type / Sub Type'
        },
        {
            Value: versionNumber,
            Label: 'Version'
        },
        {
            Value: status,
            Label: 'Status'
        },
        {
            Value: acceptedOn,
            Label: 'Accepted / Declined On'
        },
        {
            Value: lastLoginDate,
            Label: 'Last Login Date'
        }
    ]
);


annotate service.Versions with @(
    UI.HeaderInfo                             : {
        TypeName      : 'T&C Version',
        TypeNamePlural: 'T&C Versions'
    },

    UI.SelectionFields                        : [
        tcType,
        tcSubType,
        versionNumber,
        status
    ],

    UI.LineItem                               : [
        {
            Value: tcTypeSubType,
            Label: 'T&C Type / Sub Type'
        },
        {
            Value: versionNumber,
            Label: 'Version'
        },
        {
            Value: status,
            Label: 'Status'
        },
        {
            Value: effectiveDate,
            Label: 'Effective Date'
        },
        {
            Value: uploadedBy,
            Label: 'Uploaded By'
        },
        {
            Value: fileName,
            Label: 'File Name'
        }
    ],
    UI.LineItem #tableView                    : [
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
    UI.SelectionPresentationVariant #tableView: {
        $Type              : 'UI.SelectionPresentationVariantType',
        PresentationVariant: {
            $Type         : 'UI.PresentationVariantType',
            Visualizations: ['@UI.LineItem#tableView',
            ],
        },
        SelectionVariant   : {
            $Type        : 'UI.SelectionVariantType',
            SelectOptions: [],
        },
        Text               : 'T&C Versions',
    },
);

annotate service.Changes with @(
    UI.HeaderInfo: {
        TypeName       : 'T&C Change',
        TypeNamePlural : 'Change Log'
    },

    UI.SelectionFields: [
        adminEmail,
        actionType,
        tcType,
        tcSubType,
        versionNumber
    ],

    UI.LineItem #changeLogView : [
        {
            $Type : 'UI.DataField',
            Value : adminEmail,
            Label : 'Admin Email'
        },
        {
            $Type : 'UI.DataField',
            Value : actionType,
            Label : 'Action'
        },
        {
            $Type : 'UI.DataField',
            Value : tcType,
            Label : 'T&C Type'
        },
        {
            $Type : 'UI.DataField',
            Value : tcSubType,
            Label : 'T&C Sub Type'
        },
        {
            $Type : 'UI.DataField',
            Value : versionNumber,
            Label : 'Version'
        },
        {
            $Type : 'UI.DataField',
            Value : actionTimestamp,
            Label : 'Action Timestamp'
        },
        {
            $Type : 'UI.DataField',
            Value : details,
            Label : 'Details'
        }
    ],

    UI.SelectionPresentationVariant #changeLogView : {
        $Type : 'UI.SelectionPresentationVariantType',

        PresentationVariant : {
            $Type : 'UI.PresentationVariantType',
            Visualizations : [
                '@UI.LineItem#changeLogView'
            ]
        },

        SelectionVariant : {
            $Type : 'UI.SelectionVariantType'
        },

        Text : 'Change Log'
    }
);