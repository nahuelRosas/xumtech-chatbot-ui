import { useState, type FC } from "react";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import {
  useGetQuests,
  useCreateQuests,
  useEditQuest,
  useDeleteQuest,
} from "../../api/useQuests";
import type { Quest } from "../../api/types/quests";

interface AdminCreateFormProps {
  onCreate: (payload: { question: string; answer?: string }) => Promise<void>;
  creating: boolean;
}

const AdminCreateForm: FC<AdminCreateFormProps> = ({ onCreate, creating }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleCreate = async () => {
    if (!question.trim()) return;
    await onCreate({
      question: question.trim(),
      answer: answer.trim() || undefined,
    });
    setQuestion("");
    setAnswer("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question"
        className="flex-1 px-3 py-2 border rounded-md bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Answer (optional)"
        className="flex-1 px-3 py-2 border rounded-md bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={handleCreate}
        disabled={creating}
        className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm cursor-pointer"
      >
        <span className="inline-flex items-center">
          <FiPlus className="w-4 h-4" />
        </span>
        <span>{creating ? "Creating..." : "Create"}</span>
      </button>
    </div>
  );
};

interface EditPayload {
  question?: string;
  answer?: string;
}
const AdminQuestItem: FC<{
  index?: number;
  quest: Quest;
  onEdit: (p: EditPayload) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ index, quest, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [question, setQuestion] = useState(quest.question);
  const [answer, setAnswer] = useState(quest.answer ?? "");

  const isEven = (index ?? 0) % 2 === 0;

  const handleSave = async () => {
    await onEdit({ question: question.trim(), answer: answer.trim() });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li
        className={`p-1 rounded ${
          isEven
            ? "bg-white border border-gray-100"
            : "bg-amber-50 border border-amber-100"
        }`}
      >
        <div className="flex flex-col gap-2 mb-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 px-2 py-2 border rounded-md bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="flex-1 px-2 py-2 border rounded-md bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 cursor-pointer"
          >
            <span className="inline-flex items-center">
              <FiEdit className="w-4 h-4" />
            </span>
            <span>Save</span>
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-2 px-2 py-1 bg-white text-sm rounded-md hover:bg-gray-50 border border-gray-100 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex flex-col sm:flex-row items-start justify-between gap-3 p-2 rounded shadow-sm ${
        isEven
          ? "bg-white border border-gray-100"
          : "bg-amber-50 border border-amber-100"
      }`}
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-amber-700">
          {quest.question}
        </div>
        <div className="text-xs text-gray-500 break-words">{quest.answer}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-2 py-1 bg-amber-50 text-sm rounded-md hover:bg-amber-100 border border-amber-100 cursor-pointer"
        >
          <span className="inline-flex items-center">
            <FiEdit className="w-4 h-4 text-amber-700" />
          </span>
          <span className="text-sm text-amber-700">Edit</span>
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 border border-gray-100 cursor-pointer"
          aria-label="Delete"
        >
          <span className="inline-flex items-center text-red-600">
            <FiTrash2 className="w-4 h-4" />
          </span>
          <span className="text-sm text-gray-700">Delete</span>
        </button>
      </div>
    </li>
  );
};

const AdminPanel: FC = () => {
  const getQuests = useGetQuests();
  const createQuests = useCreateQuests();
  const editQuest = useEditQuest();
  const deleteQuest = useDeleteQuest();

  return (
    <div className="p-4 rounded-lg bg-white border border-gray-100 h-full overflow-auto shadow-sm">
      <div className="mb-4">
        <strong className="block mb-2 text-gray-700">Create new quest</strong>
        <AdminCreateForm
          onCreate={async (q) => {
            await createQuests.mutateAsync(q);
          }}
          creating={createQuests.isPending}
        />
      </div>

      <div>
        <strong className="block mb-2 text-gray-700">All quests</strong>
        {getQuests.isLoading ? (
          <p className="text-sm text-gray-500">Loading quests...</p>
        ) : getQuests.data?.payload?.length ? (
          <ul className="space-y-2">
            {getQuests.data.payload.map((q, idx) => (
              <AdminQuestItem
                key={q.uid}
                index={idx}
                quest={q}
                onEdit={async (payload) => {
                  await editQuest.mutateAsync({ uid: q.uid, payload });
                }}
                onDelete={async () => {
                  await deleteQuest.mutateAsync({ uid: q.uid });
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No quests found.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
