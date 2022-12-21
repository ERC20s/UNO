import { PrismaClient } from "@prisma/client";
import { CustomWs } from ".";
import msgtype from "./msgtype";
import { UserData } from "./player";
interface Question {
  type: string;
  question: string;
  answers: string[];
  correct: string;
  category: string;
  learnMoreUrl: string;
}
class Quiz {
  prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }

  async uploadQuiz(data: Question, user: UserData) {
    const question = await this.prisma.question.create({
      data: {
        ...data,
        answers: JSON.stringify(data.answers),
        author: JSON.stringify(user),
      },
    });
  }
  async removeQuiz(id: number) {
    const deleteQuiz = await this.prisma.question.delete({
      where: {
        id,
      },
    });
    console.log(deleteQuiz)
  }
  async getPassedInfo(user: string, ws: CustomWs) {
    const data = await this.prisma.history.findMany({
      where: { user },
    });
    ws.send(
      JSON.stringify({
        type: msgtype.GET_HISTORY_REPLY,
        data: data,
      })
    );
  }
  async addPassedInfo(user: string, category: string) {
    const data = await this.prisma.history.create({
      data: {
        user,
        category,
      },
    });
  }
  async getQuizToReview(ws: CustomWs) {
    const questions = await this.prisma.question.findMany({
      where: { published: false },
    });
    ws.send(
      JSON.stringify({
        type: msgtype.QUIZ_GET_REPLY,
        data: questions,
      })
    );
  }

  async getQuizByCategory(ws: CustomWs, category: string) {
    const questions = await this.prisma.question.findMany({
      where: { category, published: true },
    });
    ws.send(
      JSON.stringify({
        type: msgtype.GET_QUIZ_BY_CATEGORY_REPLY,
        data: questions,
      })
    );
  }

  async updateQuiz(ws: CustomWs, id: number, publish: boolean) {
    if (publish) {
      const update = await this.prisma.question.update({
        where: {
          id,
        },
        data: {
          published: true,
        },
      });
      if (update) {
        const questions = await this.prisma.question.findMany({
          where: { published: false },
        });
        ws.send(
          JSON.stringify({
            type: msgtype.QUIZ_ACCEPT_REPLY,
            data: questions,
          })
        );
      }
    } else {
      const deleteQuiz = await this.prisma.question.delete({
        where: {
          id,
        },
      });
      if (deleteQuiz) {
        const questions = await this.prisma.question.findMany({
          where: { published: false },
        });
        ws.send(
          JSON.stringify({
            type: msgtype.QUIZ_DECLINE_REPLY,
            data: questions,
          })
        );
      }
    }
  }
}

const quizInstance = new Quiz();
export default quizInstance;
