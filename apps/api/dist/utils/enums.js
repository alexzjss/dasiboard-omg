"use strict";
// Enums locais — espelham os enums do schema.prisma
// Usados no lugar de importar diretamente de '@prisma/client',
// pois o prisma generate não roda durante o build do buildpack.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeLanguage = exports.MaterialType = exports.KanbanTag = exports.KanbanColumn = exports.EventStatus = exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["prova"] = "prova";
    EventType["entrega"] = "entrega";
    EventType["evento"] = "evento";
    EventType["deadline"] = "deadline";
    EventType["apresentacao"] = "apresentacao";
})(EventType || (exports.EventType = EventType = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["published"] = "published";
    EventStatus["pending"] = "pending";
    EventStatus["rejected"] = "rejected";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var KanbanColumn;
(function (KanbanColumn) {
    KanbanColumn["todo"] = "todo";
    KanbanColumn["doing"] = "doing";
    KanbanColumn["done"] = "done";
})(KanbanColumn || (exports.KanbanColumn = KanbanColumn = {}));
var KanbanTag;
(function (KanbanTag) {
    KanbanTag["prova"] = "prova";
    KanbanTag["entrega"] = "entrega";
    KanbanTag["leitura"] = "leitura";
    KanbanTag["projeto"] = "projeto";
    KanbanTag["pessoal"] = "pessoal";
})(KanbanTag || (exports.KanbanTag = KanbanTag = {}));
var MaterialType;
(function (MaterialType) {
    MaterialType["livro"] = "livro";
    MaterialType["artigo"] = "artigo";
    MaterialType["video"] = "video";
    MaterialType["curso"] = "curso";
    MaterialType["link"] = "link";
    MaterialType["pdf"] = "pdf";
})(MaterialType || (exports.MaterialType = MaterialType = {}));
var ChallengeLanguage;
(function (ChallengeLanguage) {
    ChallengeLanguage["javascript"] = "javascript";
    ChallengeLanguage["python"] = "python";
    ChallengeLanguage["c"] = "c";
})(ChallengeLanguage || (exports.ChallengeLanguage = ChallengeLanguage = {}));
//# sourceMappingURL=enums.js.map